package com.company.project.controlplane.service;

import com.company.project.config.DefaultRolePermissions;
import com.company.project.config.PermissionCatalog;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.entities.TenantProvisioningLog;
import com.company.project.controlplane.entities.UserDirectoryEntry;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantProvisioningLogRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import org.flywaydb.core.Flyway;
import org.hibernate.jpa.HibernatePersistenceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Phase 3: provisions a brand-new, dedicated Postgres database per gym on creation.
 *
 * The login gap this class's Phase 3 doc comment used to describe (a newly-
 * provisioned tenant's owner couldn't log in, because UserDetailsServiceImpl ran
 * before any tenant context existed) was closed in Phase 5: this class now also
 * writes a user_directory row for the new owner (see createOwnerUser), so
 * AuthService.login() can resolve the tenant slug BEFORE authenticating.
 *
 * Phase 7: each tenant now gets a real, dedicated Postgres role that OWNS its own
 * database (see provisionDatabase) — replacing the earlier "every tenant reuses
 * the shared admin role" design. The role's password is AES-encrypted
 * (CredentialEncryptionService) before being stored in TenantConnection, and is
 * what buildTenantDataSource/runSchemaAndMigrations actually connect as.
 */
@Service
public class TenantProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioningService.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantProvisioningLogRepository provisioningLogRepository;
    private final UserDirectoryRepository userDirectoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final CredentialEncryptionService credentialEncryptionService;

    @Value("${spring.datasource.url}")
    private String adminJdbcUrl;

    @Value("${spring.datasource.username}")
    private String adminUsername;

    @Value("${spring.datasource.password}")
    private String adminPassword;

    @Value("${tenant.provisioning.db-name-prefix:gymbios_}")
    private String dbNamePrefix;

    public TenantProvisioningService(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            TenantProvisioningLogRepository provisioningLogRepository,
            UserDirectoryRepository userDirectoryRepository,
            PasswordEncoder passwordEncoder,
            CredentialEncryptionService credentialEncryptionService) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.provisioningLogRepository = provisioningLogRepository;
        this.userDirectoryRepository = userDirectoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.credentialEncryptionService = credentialEncryptionService;
    }

    /**
     * Synchronous part: inserts the PROVISIONING Tenant row on the calling request
     * thread, so a slug-collision failure surfaces to the caller as an ordinary error
     * rather than being swallowed inside an @Async method nobody is listening to.
     */
    @Transactional("controlPlaneTransactionManager")
    public Tenant beginProvisioning(String name, String slug) {
        Tenant tenant = new Tenant(name, slug);
        tenant.setStatus("PROVISIONING");
        return tenantRepository.save(tenant);
    }

    /**
     * The full multi-step provisioning job. Runs on tenantProvisioningExecutor
     * (see config.AsyncConfig) — fire-and-forget from the caller's perspective.
     * Takes plain primitives, not the Tenant entity loaded on the calling thread's
     * persistence context, since that entity must not cross threads.
     */
    @Async("tenantProvisioningExecutor")
    public void provisionAsync(Long tenantId, String slug, String gymName,
                                String ownerUsername, String rawOwnerPassword, String ownerEmail) {
        provisionAsync(tenantId, slug, gymName, ownerUsername, rawOwnerPassword, ownerEmail, null, null, null);
    }

    /**
     * Overload accepting the gym's address/lat/lng, picked via the Add Gym form's
     * location search (or plain free text) — threaded through to
     * createInitialBranchAndGym so it's persisted at creation time instead of only
     * surviving if the caller later opens Edit and re-saves (a pre-existing gap:
     * the original overload above never received these fields at all).
     */
    @Async("tenantProvisioningExecutor")
    public void provisionAsync(Long tenantId, String slug, String gymName,
                                String ownerUsername, String rawOwnerPassword, String ownerEmail,
                                String address, Double lat, Double lng) {
        String dbName = dbNamePrefix + sanitize(slug);
        String roleName = roleNameFor(slug);
        try {
            // A prior attempt's stored, encrypted password is the one source of truth
            // for what the role's real Postgres password already is — reused verbatim
            // on retry so provisionDatabase never needs to (and never does) touch an
            // existing role's password. Only a genuinely first-ever attempt generates
            // a brand-new one.
            String existingPassword = existingTenantDbPassword(tenantId);

            logStep(tenantId, "CREATE_DATABASE", null);
            String tenantDbPassword = provisionDatabase(dbName, roleName, existingPassword);

            logStep(tenantId, "STORE_CONNECTION", null);
            storeConnection(tenantId, dbName, roleName, tenantDbPassword);

            DataSource tenantDs = buildTenantDataSource(dbName, roleName, tenantDbPassword);

            logStep(tenantId, "RUN_MIGRATIONS", null);
            runSchemaAndMigrations(tenantDs, slug);

            logStep(tenantId, "SEED_ROLES_PERMISSIONS", null);
            seedRolesAndPermissions(tenantDs);

            logStep(tenantId, "CREATE_BRANCH", null);
            Long branchId = createInitialBranchAndGym(tenantDs, gymName, slug, address, lat, lng);

            logStep(tenantId, "CREATE_OWNER", null);
            String passwordHash = passwordEncoder.encode(rawOwnerPassword);
            Long ownerUserId = createOwnerUser(tenantDs, branchId, ownerUsername, passwordHash, ownerEmail);

            writeDirectoryEntry(ownerUsername, ownerEmail, slug);
            logStep(tenantId, "WRITE_DIRECTORY_ENTRY", null);

            activateTenant(tenantId, ownerUserId);
            logStep(tenantId, "ACTIVATE", null);
        } catch (Exception e) {
            log.error("Tenant provisioning failed for tenantId={} slug={}", tenantId, slug, e);
            markFailed(tenantId);
            logStep(tenantId, "FAILED", e.getMessage());
        }
    }

    /**
     * Re-entry point for POST /api/gyms/{tenantId}/retry-provisioning. Every inner
     * step re-checks existence before acting (see provisionDatabase/seedRolesAndPermissions/
     * createOwnerUser), so re-running the full sequence never duplicates data.
     */
    @Transactional("controlPlaneTransactionManager")
    public Tenant retryProvisioning(Long tenantId, String ownerUsername, String rawOwnerPassword, String ownerEmail) {
        return retryProvisioning(tenantId, ownerUsername, rawOwnerPassword, ownerEmail, null, null, null);
    }

    @Transactional("controlPlaneTransactionManager")
    public Tenant retryProvisioning(Long tenantId, String ownerUsername, String rawOwnerPassword, String ownerEmail,
                                     String address, Double lat, Double lng) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + tenantId));
        tenant.setStatus("PROVISIONING");
        tenant = tenantRepository.save(tenant);
        provisionAsync(tenant.getId(), tenant.getSlug(), tenant.getName(), ownerUsername, rawOwnerPassword, ownerEmail,
                address, lat, lng);
        return tenant;
    }

    // ── Step implementations ─────────────────────────────────────────────────────

    private String sanitize(String slug) {
        return slug.toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    // Deterministic from the slug, matching the existing dbName derivation style —
    // "tenant_" avoids ever colliding with a real login-role naming convention this
    // codebase might introduce later, and Postgres role names share the same
    // identifier rules as database names, so the same sanitize() applies.
    // Package-private (not private): reused by TenantDataMigrationService (Phase 7),
    // matching the existing reuse pattern for provisionDatabase/buildTenantDataSource/
    // runSchemaAndMigrations.
    String roleNameFor(String slug) {
        return "tenant_" + sanitize(slug);
    }

    /**
     * Creates a dedicated Postgres role for this tenant and makes it the OWNER of a
     * freshly-created database — full rights inside that one database, zero rights
     * anywhere else (Postgres roles have no implicit cross-database privileges).
     * Replaces the earlier "every tenant reuses the shared admin role" design: this
     * same admin connection already had the privilege to do this, nothing new was
     * needed to unlock it. CREATE ROLE/DATABASE cannot run inside a transaction
     * block, so this opens a plain JDBC connection (autocommit, the driver default)
     * against the "postgres" system database — never against the primary GYMBIOS
     * database, which could itself be a target. Both steps are existence-checked
     * first so retry-provisioning stays idempotent.
     *
     * `existingPassword` (from a prior attempt's already-stored, decrypted
     * TenantConnection — see existingTenantDbPassword) is the single source of
     * truth for what the role's real Postgres password already is on a retry; when
     * present, the role is created/left alone with THAT password rather than a
     * fresh one, so this method never desyncs the role's actual password from what
     * gets persisted in storeConnection. A brand-new tenant (no prior attempt) gets
     * a freshly generated password.
     *
     * Returns the plaintext password to use for this tenant — the caller is
     * responsible for encrypting it before persisting (see storeConnection) and for
     * discarding this in-memory copy once used to build the tenant DataSource.
     */
    // Package-private (not private): reused as-is by TenantDataMigrationService's
    // real-data migration flow (Phase 4), which needs the identical database-creation/
    // bootstrap steps this fresh-gym flow already proved.
    String provisionDatabase(String dbName, String roleName, String existingPassword) throws Exception {
        String password = existingPassword != null ? existingPassword : generateTenantPassword();
        String systemDbUrl = adminJdbcUrl.replaceAll("/[^/]+$", "/postgres");
        try (Connection conn = DriverManager.getConnection(systemDbUrl, adminUsername, adminPassword)) {
            boolean roleExists;
            try (PreparedStatement check = conn.prepareStatement("SELECT 1 FROM pg_roles WHERE rolname = ?")) {
                check.setString(1, roleName);
                try (ResultSet rs = check.executeQuery()) {
                    roleExists = rs.next();
                }
            }

            if (!roleExists) {
                try (PreparedStatement create = conn.prepareStatement(
                        "CREATE ROLE " + quoteIdentifier(roleName) + " WITH LOGIN PASSWORD '" + password.replace("'", "''") + "'")) {
                    create.executeUpdate();
                }
            }

            try (PreparedStatement check = conn.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
                check.setString(1, dbName);
                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next()) {
                        return password; // already exists — idempotent retry
                    }
                }
            }
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("CREATE DATABASE " + quoteIdentifier(dbName) + " OWNER " + quoteIdentifier(roleName));
                // Postgres grants CONNECT to PUBLIC on every new database by default —
                // ownership alone does NOT stop other roles from connecting (they'd just
                // have no table-level grants once inside). Revoking PUBLIC's connect and
                // granting it back only to this tenant's own role closes that gap:
                // confirmed live via has_database_privilege() that every other role
                // (including the shared admin role used by tenants from before this
                // phase) could otherwise still open a connection to this database.
                stmt.executeUpdate("REVOKE CONNECT ON DATABASE " + quoteIdentifier(dbName) + " FROM PUBLIC");
                stmt.executeUpdate("GRANT CONNECT ON DATABASE " + quoteIdentifier(dbName) + " TO " + quoteIdentifier(roleName));
            }
            return password;
        }
    }

    /** Decrypted password from a prior attempt's stored TenantConnection, or null if this tenant has never gotten that far before. */
    private String existingTenantDbPassword(Long tenantId) {
        return tenantConnectionRepository.findByTenantId(tenantId)
                .map(TenantConnection::getDbCredentialEnc)
                .map(credentialEncryptionService::decrypt)
                .orElse(null);
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    /**
     * Persists the tenant's real Postgres role/password — the password is AES-
     * encrypted (CredentialEncryptionService) before storage, never plaintext.
     * Retry-safe: if a TenantConnection row already exists for this tenant (a
     * prior attempt got this far), its stored credential is left untouched rather
     * than being overwritten with a freshly-generated password that wouldn't match
     * the role's actual Postgres password (provisionDatabase only regenerates a
     * password when the role doesn't exist yet).
     */
    @Transactional("controlPlaneTransactionManager")
    protected void storeConnection(Long tenantId, String dbName, String roleName, String tenantDbPassword) {
        TenantConnection connection = tenantConnectionRepository.findByTenantId(tenantId).orElse(null);
        if (connection != null) {
            return; // already stored by an earlier attempt — its credential is still correct
        }
        connection = new TenantConnection();
        connection.setTenantId(tenantId);
        connection.setDbHost(extractHost(adminJdbcUrl));
        connection.setDbPort(extractPort(adminJdbcUrl));
        connection.setDbName(dbName);
        connection.setDbUsername(roleName);
        connection.setDbCredentialEnc(credentialEncryptionService.encrypt(tenantDbPassword));
        tenantConnectionRepository.save(connection);
    }

    private String generateTenantPassword() {
        byte[] bytes = new byte[16];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String extractHost(String jdbcUrl) {
        // jdbc:postgresql://HOST:PORT/DBNAME
        String withoutPrefix = jdbcUrl.substring("jdbc:postgresql://".length());
        String hostPort = withoutPrefix.split("/", 2)[0];
        return hostPort.split(":")[0];
    }

    private Integer extractPort(String jdbcUrl) {
        String withoutPrefix = jdbcUrl.substring("jdbc:postgresql://".length());
        String hostPort = withoutPrefix.split("/", 2)[0];
        String[] parts = hostPort.split(":");
        return parts.length > 1 ? Integer.parseInt(parts[1]) : 5432;
    }

    // Package-private (not private): reused by TenantDataMigrationService (Phase 4).
    // Connects AS the tenant's own role, which owns this database and therefore has
    // full DDL rights within it (needed by runSchemaAndMigrations's Hibernate
    // schema-export + Flyway CREATE TABLE steps) and no rights anywhere else.
    DataSource buildTenantDataSource(String dbName, String roleName, String tenantDbPassword) {
        String tenantUrl = adminJdbcUrl.replaceAll("/[^/]+$", "/" + dbName);
        return DataSourceBuilder.create()
                .url(tenantUrl)
                .username(roleName)
                .password(tenantDbPassword)
                .driverClassName("org.postgresql.Driver")
                .build();
    }

    /**
     * Phase 3's own investigation found the Flyway chain alone cannot bootstrap a
     * fresh database — only ~25 of ~93 entity tables are ever created by a Flyway
     * CREATE TABLE; the rest were historically created by Hibernate ddl-auto, with
     * Flyway bolted on top later (baseline-on-migrate=true/baseline-version=0).
     * Re-verified directly against a fresh local database: Flyway alone fails at V3
     * (ALTER TABLE journal_vouchers, a table no migration ever creates). So this runs
     * a one-time Hibernate schema-export pass FIRST — a throwaway
     * LocalContainerEntityManagerFactoryBean, opened and closed within this method,
     * never a Spring @Bean — then the same Flyway chain the primary DB uses, with the
     * same baselineOnMigrate/baselineVersion flags as PrimaryDataSourceConfig.flyway.
     */
    // Package-private (not private): reused by TenantDataMigrationService (Phase 4),
    // which bootstraps a real gym's target schema identically before copying its real
    // data in, rather than seeding fresh defaults.
    void runSchemaAndMigrations(DataSource tenantDs, String slug) throws Exception {
        LocalContainerEntityManagerFactoryBean emfBean = new LocalContainerEntityManagerFactoryBean();
        emfBean.setDataSource(tenantDs);
        emfBean.setPackagesToScan("com.company.project.entities");
        emfBean.setPersistenceProvider(new HibernatePersistenceProvider());
        emfBean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        emfBean.setPersistenceUnitName("tenant-bootstrap-" + sanitize(slug));
        Properties jpaProperties = new Properties();
        jpaProperties.put("hibernate.hbm2ddl.auto", "update");
        emfBean.setJpaProperties(jpaProperties);
        emfBean.afterPropertiesSet();
        try {
            emfBean.getObject(); // force initialization / schema export
        } finally {
            emfBean.destroy();
        }

        Flyway flyway = Flyway.configure()
                .dataSource(tenantDs)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();
        flyway.migrate();
    }

    /**
     * Raw JDBC, not JPA: spinning up a full Hibernate persistence unit to insert a
     * handful of rows into a DataSource that gets discarded seconds later is
     * unjustified overhead for a one-shot job. Reuses PermissionCatalog.MODULES and
     * DefaultRolePermissions.GRANTS directly — both plain static data with zero DB
     * dependency, the same source of truth DataInitializer seeds the primary DB from.
     * Explicitly SKIPPED per user decision: no platform-owner admin user, no
     * warehouses/suppliers/categories/addon-plans/account-heads/fiscal-year/sample
     * products — only roles + permissions + role_permissions.
     */
    private void seedRolesAndPermissions(DataSource tenantDs) throws Exception {
        try (Connection conn = tenantDs.getConnection()) {
            List<String> roleNames = List.of(
                    "GYMBIOS_ADMIN", "ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR",
                    "MEMBER", "STAFF", "RECEPTIONIST", "TRAINER"
            );
            // Included INCLUDING GYMBIOS_ADMIN/ADMIN: RoleService's ADMIN-equals-all-
            // permissions / GYMBIOS_ADMIN-platform-bypass logic is pure Java code that
            // runs identically regardless of which DB it's pointed at, and other app
            // code (SecurityConfig role checks) assumes these role names exist.
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO roles (role_name, is_system, created_at) VALUES (?, false, now()) " +
                            "ON CONFLICT (role_name) DO NOTHING")) {
                for (String roleName : roleNames) {
                    ps.setString(1, roleName);
                    ps.addBatch();
                }
                ps.executeBatch();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO permissions (permission_key, module, action, description, created_at) " +
                            "VALUES (?, ?, ?, ?, now()) ON CONFLICT (permission_key) DO NOTHING")) {
                for (Map.Entry<String, List<String>> entry : PermissionCatalog.MODULES.entrySet()) {
                    String module = entry.getKey();
                    for (String action : entry.getValue()) {
                        String key = PermissionCatalog.key(module, action);
                        ps.setString(1, key);
                        ps.setString(2, module);
                        ps.setString(3, action);
                        ps.setString(4, module + " - " + action);
                        ps.addBatch();
                    }
                }
                ps.executeBatch();
            }

            // NOT "ON CONFLICT (role_id, permission_id)": that requires a real unique
            // constraint on exactly those two columns, which — a pre-existing gap
            // independent of this phase — exists only in V17's migration SQL, never on
            // the RolePermission entity itself. Since this bootstrap's schema comes from
            // Hibernate's schema-export pass (see runSchemaAndMigrations), the table it
            // creates has no such constraint, and Flyway's CREATE TABLE IF NOT EXISTS is
            // then a no-op (confirmed: the live GYMBIOS database has the identical gap —
            // its role_permissions table has no unique constraint either). WHERE NOT
            // EXISTS achieves the same idempotent insert without depending on a
            // constraint that was never actually created.
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO role_permissions (role_id, permission_id, created_at) " +
                            "SELECT r.id, p.id, now() FROM roles r, permissions p " +
                            "WHERE r.role_name = ? AND p.permission_key = ? " +
                            "AND NOT EXISTS (" +
                            "  SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id" +
                            ")")) {
                for (Map.Entry<String, List<String>> entry : DefaultRolePermissions.GRANTS.entrySet()) {
                    String roleName = entry.getKey();
                    for (String permissionKey : entry.getValue()) {
                        ps.setString(1, roleName);
                        ps.setString(2, permissionKey);
                        ps.addBatch();
                    }
                }
                ps.executeBatch();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE roles SET is_system = true WHERE role_name = ANY (?)")) {
                ps.setArray(1, conn.createArrayOf("varchar", DefaultRolePermissions.SYSTEM_ROLE_NAMES.toArray()));
                ps.executeUpdate();
            }
        }
    }

    /**
     * V18/V24 already auto-seed a "Main Branch"/"Main Gym" row (ON CONFLICT DO
     * NOTHING) as part of the same Flyway chain every tenant DB just ran. Since
     * is_default has no DB-level uniqueness constraint, this repurposes that row via
     * UPDATE rather than inserting a second gym/branch row — a second is_default=true
     * row would make findByIsDefaultTrue() pick an arbitrary one of two. This
     * satisfies "create one initial branch" via the pre-existing seeded row.
     */
    private Long createInitialBranchAndGym(DataSource tenantDs, String gymName, String slug,
                                            String address, Double lat, Double lng) throws Exception {
        try (Connection conn = tenantDs.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE gyms SET name = ?, slug = ?, "
                            + "address = COALESCE(?, address), lat = COALESCE(?, lat), lng = COALESCE(?, lng), "
                            + "updated_at = now() WHERE is_default = true")) {
                ps.setString(1, gymName);
                ps.setString(2, slug);
                ps.setObject(3, address);
                ps.setObject(4, lat);
                ps.setObject(5, lng);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id FROM branches WHERE is_default = true")) {
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return rs.getLong("id");
                    }
                }
            }
            throw new IllegalStateException("No default branch found after migration — V18 seed row missing");
        }
    }

    private Long createOwnerUser(DataSource tenantDs, Long branchId, String username, String passwordHash, String email)
            throws Exception {
        try (Connection conn = tenantDs.getConnection()) {
            Long userId;
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO users (username, email, password_hash, enabled, created_at) " +
                            "VALUES (?, ?, ?, true, now()) RETURNING id")) {
                ps.setString(1, username);
                ps.setString(2, email);
                ps.setString(3, passwordHash);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    userId = rs.getLong("id");
                }
            }

            Long adminRoleId;
            try (PreparedStatement ps = conn.prepareStatement("SELECT id FROM roles WHERE role_name = 'ADMIN'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    adminRoleId = rs.getLong("id");
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, now())")) {
                ps.setLong(1, userId);
                ps.setLong(2, adminRoleId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO user_branches (user_id, branch_id, created_at) VALUES (?, ?, now()) " +
                            "ON CONFLICT (user_id, branch_id) DO NOTHING")) {
                ps.setLong(1, userId);
                ps.setLong(2, branchId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE gyms SET owner_user_id = ? WHERE is_default = true")) {
                ps.setLong(1, userId);
                ps.executeUpdate();
            }

            return userId;
        }
    }

    /**
     * Phase 5: lets AuthService.login() resolve this owner's tenant slug BEFORE
     * authenticating, so UserDetailsServiceImpl (unchanged) transparently hits this
     * tenant's own database. Uses "set" (not "update"/insert-only) semantics via a
     * plain existence check first, so a retry-provisioning re-run never fails on a
     * duplicate-key constraint.
     */
    @Transactional("controlPlaneTransactionManager")
    protected void writeDirectoryEntry(String username, String email, String tenantSlug) {
        if (userDirectoryRepository.existsByUsername(username)) {
            return;
        }
        userDirectoryRepository.save(new UserDirectoryEntry(username, email, tenantSlug));
    }

    @Transactional("controlPlaneTransactionManager")
    protected void activateTenant(Long tenantId, Long ownerUserId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        tenant.setStatus("ACTIVE");
        tenant.setOwnerUserId(ownerUserId); // cross-database Long, no FK enforcement — same accepted pattern as Gym.ownerUserId
        tenantRepository.save(tenant);
    }

    @Transactional("controlPlaneTransactionManager")
    protected void markFailed(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        tenant.setStatus("PROVISION_FAILED");
        tenantRepository.save(tenant);
    }

    /** Its own transactional unit so a later step's failure doesn't roll back earlier steps' log rows. */
    @Transactional("controlPlaneTransactionManager")
    protected void logStep(Long tenantId, String step, String errorMessage) {
        TenantProvisioningLog logEntry = new TenantProvisioningLog();
        logEntry.setTenantId(tenantId);
        logEntry.setStep(step);
        logEntry.setErrorMessage(errorMessage);
        logEntry.setAttemptedAt(LocalDateTime.now());
        provisioningLogRepository.save(logEntry);
    }
}
