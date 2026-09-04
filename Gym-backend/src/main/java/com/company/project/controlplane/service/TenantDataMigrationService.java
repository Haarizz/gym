package com.company.project.controlplane.service;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.entities.TenantProvisioningLog;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantProvisioningLogRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.migration.BridgeEdges;
import com.company.project.controlplane.service.migration.MigrationVerifier;
import com.company.project.controlplane.service.migration.MigrationVerifier.VerificationReport;
import com.company.project.controlplane.service.migration.SchemaIntrospector;
import com.company.project.controlplane.service.migration.SchemaIntrospector.ForeignKeyEdge;
import com.company.project.controlplane.service.migration.SchemaIntrospector.TablePrimaryKey;
import com.company.project.controlplane.service.migration.TableCopyEngine;
import com.company.project.controlplane.service.migration.TableCopyEngine.CopyResult;
import com.company.project.controlplane.service.migration.TenantTableGraph;
import com.company.project.controlplane.service.migration.TenantTableGraph.ClassifiedTable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 4: migrates an EXISTING gym's real data out of the shared primary database
 * into its own dedicated tenant database — reusing Phase 3's TenantProvisioningService
 * database-creation/schema-bootstrap machinery, but copying real rows instead of
 * seeding fresh empty defaults.
 *
 * Table scoping/order is derived from the LIVE database schema at runtime (see
 * SchemaIntrospector/TenantTableGraph), not a hand-typed list — two independent
 * hand-built inventories were each found to be wrong during this feature's own design
 * review (see class docs on those two classes for specifics).
 *
 * The primary database is READ-ONLY for this entire flow — every access to it is a
 * SELECT. All writes happen against the freshly-created target tenant database.
 */
@Service
public class TenantDataMigrationService {

    private static final Logger log = LoggerFactory.getLogger(TenantDataMigrationService.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantProvisioningLogRepository provisioningLogRepository;
    private final TenantProvisioningService tenantProvisioningService;
    private final CredentialEncryptionService credentialEncryptionService;
    private final DataSource primarySource;
    private final SchemaIntrospector schemaIntrospector = new SchemaIntrospector();
    private final TenantTableGraph tenantTableGraph = new TenantTableGraph();
    private final TableCopyEngine tableCopyEngine = new TableCopyEngine();
    private final MigrationVerifier migrationVerifier = new MigrationVerifier();

    @Value("${spring.datasource.url}")
    private String adminJdbcUrl;

    @Value("${spring.datasource.username}")
    private String adminUsername;

    @Value("${spring.datasource.password}")
    private String adminPassword;

    @Value("${tenant.provisioning.db-name-prefix:gymbios_}")
    private String dbNamePrefix;

    public TenantDataMigrationService(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            TenantProvisioningLogRepository provisioningLogRepository,
            TenantProvisioningService tenantProvisioningService,
            CredentialEncryptionService credentialEncryptionService,
            @Qualifier("primaryDataSource") DataSource primarySource) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.provisioningLogRepository = provisioningLogRepository;
        this.tenantProvisioningService = tenantProvisioningService;
        this.credentialEncryptionService = credentialEncryptionService;
        this.primarySource = primarySource;
    }

    public void migrateExistingGym(Long gymId) throws Exception {
        // Raw JDBC against the primary DB, not GymRepository/JPA — this service
        // deliberately stays outside the primary persistence unit's transactional
        // scope, matching TenantProvisioningService's own raw-JDBC style.
        GymRow gym = loadGym(gymId);
        List<Long> branchIds = loadBranchIds(gymId);
        log.info("Migrating gym id={} slug={} name='{}' with {} branches: {}",
                gymId, gym.slug, gym.name, branchIds.size(), branchIds);

        Tenant tenant = tenantRepository.findBySlug(gym.slug)
                .orElseThrow(() -> new IllegalStateException(
                        "No control-plane Tenant found for slug " + gym.slug
                                + " — run the Phase 1 backfill first (--control-plane.backfill.enabled=true)"));
        setTenantStatus(tenant.getId(), "PROVISIONING");
        logStep(tenant.getId(), "MIGRATION_START", null);

        String dbName = dbNamePrefix + sanitize(gym.slug);
        String roleName = tenantProvisioningService.roleNameFor(gym.slug);
        try {
            dropDatabaseIfExists(dbName, roleName);
            logStep(tenant.getId(), "DROP_EXISTING_TARGET", null);

            // Always drop-and-recreate above, so there is never a prior password to
            // preserve here — unlike TenantProvisioningService's own idempotent-retry
            // call site, this always passes null (generate fresh).
            String tenantDbPassword = tenantProvisioningService.provisionDatabase(dbName, roleName, null);
            logStep(tenant.getId(), "CREATE_DATABASE", null);

            storeConnection(tenant.getId(), dbName, roleName, tenantDbPassword);
            logStep(tenant.getId(), "STORE_CONNECTION", null);

            DataSource tenantDs = tenantProvisioningService.buildTenantDataSource(dbName, roleName, tenantDbPassword);

            tenantProvisioningService.runSchemaAndMigrations(tenantDs, gym.slug);
            logStep(tenant.getId(), "RUN_MIGRATIONS", null);

            deletePlaceholderGymAndBranch(tenantDs);
            logStep(tenant.getId(), "DELETE_PLACEHOLDERS", null);

            Map<String, SchemaIntrospector.TablePrimaryKey> primaryKeys;
            Map<String, Set<Long>> copiedIdSets = new HashMap<>();
            try (Connection sourceConn = primarySource.getConnection()) {
                primaryKeys = schemaIntrospector.findPrimaryKeys(sourceConn);
            }

            copySeedTables(tenantDs, gym, branchIds, primaryKeys, copiedIdSets);
            logStep(tenant.getId(), "COPY_SEED_TABLES", null);

            Set<String> rootTables;
            List<ForeignKeyEdge> edges;
            List<String> allTables;
            try (Connection sourceConn = primarySource.getConnection()) {
                rootTables = schemaIntrospector.findBranchIdTables(sourceConn);
                edges = new ArrayList<>(schemaIntrospector.findForeignKeyEdges(sourceConn));
                edges.addAll(BridgeEdges.JPA_ONLY_EDGES);
                allTables = schemaIntrospector.findAllTables(sourceConn);
            }

            assertNoUnexpectedNullBranchRows(rootTables);
            logStep(tenant.getId(), "NULL_BRANCH_ID_GUARD", null);

            List<ClassifiedTable> order = tenantTableGraph.computeCopyOrder(rootTables, edges, allTables);
            logStep(tenant.getId(), "COMPUTE_COPY_ORDER", null);

            List<CopyResult> results = tableCopyEngine.copyAll(
                    primarySource, tenantDs, order, gymId, branchIds, primaryKeys, copiedIdSets);
            for (CopyResult r : results) {
                if (r.sourceRowCount() != r.targetRowCount()) {
                    log.warn("Row count mismatch for {}: source={} target={}", r.tableName(), r.sourceRowCount(), r.targetRowCount());
                }
            }
            logStep(tenant.getId(), "COPY_SCOPED_AND_GLOBAL_TABLES", null);

            VerificationReport report = migrationVerifier.verify(primarySource, tenantDs, gymId, branchIds);
            logStep(tenant.getId(), "VERIFY", report.overallPass() ? null : "Verification found discrepancies — see logs");

            setTenantStatus(tenant.getId(), "ACTIVE");
            logStep(tenant.getId(), "ACTIVATE", null);
            log.info("Migration complete for gym id={} slug={} — verification pass={}", gymId, gym.slug, report.overallPass());
        } catch (Exception e) {
            log.error("Data migration failed for gymId={} slug={}", gymId, gym.slug, e);
            setTenantStatus(tenant.getId(), "PROVISION_FAILED");
            logStep(tenant.getId(), "MIGRATION_FAILED", e.getMessage());
            throw e;
        }
    }

    // ── Seed loading (gym/branches from the primary DB) ─────────────────────────

    private record GymRow(Long id, String name, String slug, Long ownerUserId, boolean isDefault, String status) {}

    private GymRow loadGym(Long gymId) throws Exception {
        try (Connection conn = primarySource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT id, name, slug, owner_user_id, is_default, status FROM gyms WHERE id = ?")) {
            ps.setLong(1, gymId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalStateException("Gym not found in primary database: id=" + gymId);
                }
                return new GymRow(
                        rs.getLong("id"), rs.getString("name"), rs.getString("slug"),
                        rs.getObject("owner_user_id", Long.class), rs.getBoolean("is_default"), rs.getString("status"));
            }
        }
    }

    private List<Long> loadBranchIds(Long gymId) throws Exception {
        List<Long> ids = new ArrayList<>();
        try (Connection conn = primarySource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT id FROM branches WHERE gym_id = ?")) {
            ps.setLong(1, gymId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ids.add(rs.getLong("id"));
                }
            }
        }
        return ids;
    }

    // ── Target DB lifecycle ──────────────────────────────────────────────────────

    private String sanitize(String slug) {
        return slug.toLowerCase().replaceAll("[^a-z0-9_]", "_");
    }

    /**
     * Unlike TenantProvisioningService's fresh-gym flow (which must NEVER drop a
     * database), this migration is explicitly re-runnable: the target only ever
     * contains a byproduct of this same script, so dropping and recreating it at the
     * start of each run is simpler and more auditable than incremental resume logic.
     * This method lives here, not on TenantProvisioningService, so drop-and-recreate
     * behavior cannot leak into the fresh-gym-creation code path.
     */
    // Phase 7: drops the role alongside the database it owns, not just the database
    // — since this migration always drops-and-recreates on every run (see this
    // method's class-level doc comment), the role gets a fresh CREATE ROLE +
    // regenerated password each time too, matching that same "simpler and more
    // auditable than incremental resume logic" philosophy. DROP DATABASE first
    // (a role that owns a database cannot be dropped while it still does).
    private void dropDatabaseIfExists(String dbName, String roleName) throws Exception {
        String systemDbUrl = adminJdbcUrl.replaceAll("/[^/]+$", "/postgres");
        try (Connection conn = DriverManager.getConnection(systemDbUrl, adminUsername, adminPassword)) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("DROP DATABASE IF EXISTS " + quoteIdentifier(dbName) + " WITH (FORCE)");
                stmt.executeUpdate("DROP ROLE IF EXISTS " + quoteIdentifier(roleName));
            }
        }
    }

    private void storeConnection(Long tenantId, String dbName, String roleName, String tenantDbPassword) {
        TenantConnection connection = tenantConnectionRepository.findByTenantId(tenantId).orElse(new TenantConnection());
        connection.setTenantId(tenantId);
        connection.setDbHost(extractHost(adminJdbcUrl));
        connection.setDbPort(extractPort(adminJdbcUrl));
        connection.setDbName(dbName);
        connection.setDbUsername(roleName);
        connection.setDbCredentialEnc(credentialEncryptionService.encrypt(tenantDbPassword));
        tenantConnectionRepository.save(connection);
    }

    private String extractHost(String jdbcUrl) {
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

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    /**
     * runSchemaAndMigrations triggers three auto-seeded placeholder rows as a side
     * effect of running the Flyway chain:
     *   - V18/V24's "Main Branch"/"Main Gym" (is_default=true, no DB-level uniqueness
     *     constraint, so these are DELETEd rather than reconciled/merged — safe
     *     because nothing yet references those placeholder ids at this point).
     *   - V9's global account_heads seed row (code='5800', branch_id NULL at insert
     *     time), which V20 then re-homes onto whatever branch ends up as id=1 in this
     *     fresh database — colliding with the source's own real (branch_id=1,
     *     code='5800') row under the uk_account_heads_branch_code constraint.
     *     Identified as the seed placeholder (not real data) by its exact literal
     *     values (opening/current balance 0, EXPENSE type) rather than by id, since
     *     an id match alone wouldn't distinguish it from genuine data.
     */
    private void deletePlaceholderGymAndBranch(DataSource tenantDs) throws Exception {
        try (Connection conn = tenantDs.getConnection()) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("DELETE FROM branches WHERE is_default = true");
                stmt.executeUpdate("DELETE FROM gyms WHERE is_default = true");
                stmt.executeUpdate(
                        "DELETE FROM account_heads WHERE code = '5800' AND name = 'Depreciation Expense' "
                                + "AND type = 'EXPENSE' AND opening_balance = 0 AND current_balance = 0");
            }
        }
    }

    // ── Seed table copy (gyms/branches/users — explicit, not schema-discovered) ──

    /**
     * gyms/branches/users are the migration's necessary seed inputs, not something
     * the generic Root/Scoped/Global classification could discover: gyms/branches
     * have no self-referential scoping signal, and users is never the CHILD of a
     * Root table in this schema (user_roles/user_branches/community_posts all point
     * TO users) — a generic walk would misclassify it as Global and copy every user,
     * including the platform-owner account this migration must never copy into a
     * tenant database. See TenantTableGraph.SEED_TABLES' doc comment for the same
     * reasoning from the classification side.
     */
    private void copySeedTables(DataSource tenantDs, GymRow gym, List<Long> branchIds,
                                 Map<String, TablePrimaryKey> primaryKeys,
                                 Map<String, Set<Long>> copiedIdSets) throws Exception {
        Long[] branchIdArray = branchIds.toArray(new Long[0]);

        tableCopyEngine.copySeedTable(primarySource, tenantDs, "gyms",
                "id = ?", new Object[]{gym.id()}, primaryKeys.get("gyms"), copiedIdSets);

        tableCopyEngine.copySeedTable(primarySource, tenantDs, "branches",
                "id = ANY(?)", new Object[]{branchIdArray}, primaryKeys.get("branches"), copiedIdSets);

        tableCopyEngine.copySeedTable(primarySource, tenantDs, "users",
                "id IN (SELECT user_id FROM user_branches WHERE branch_id = ANY(?)) OR id = "
                        + "(SELECT owner_user_id FROM gyms WHERE id = ?)",
                new Object[]{branchIdArray, gym.id()}, primaryKeys.get("users"), copiedIdSets);
    }

    // ── NULL branch_id runtime guard ─────────────────────────────────────────────

    private static final Set<String> NULL_ALLOWED_ROOT_TABLES = Set.of("notifications", "financial_settings");

    /**
     * Converts what was originally a one-time human data audit into a repeatable
     * runtime assertion — aborts loudly if any Root table (other than the two
     * explicitly-approved exceptions) has a NULL branch_id row, rather than silently
     * dropping or silently including it.
     */
    private void assertNoUnexpectedNullBranchRows(Set<String> rootTables) throws Exception {
        List<String> violations = new ArrayList<>();
        try (Connection conn = primarySource.getConnection()) {
            for (String table : rootTables) {
                if (NULL_ALLOWED_ROOT_TABLES.contains(table)) {
                    continue;
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT count(*) FROM " + quoteIdentifier(table) + " WHERE branch_id IS NULL")) {
                    try (ResultSet rs = ps.executeQuery()) {
                        rs.next();
                        long count = rs.getLong(1);
                        if (count > 0) {
                            violations.add(table + " (" + count + " NULL rows)");
                        }
                    }
                }
            }
        }
        if (!violations.isEmpty()) {
            throw new IllegalStateException(
                    "Unexpected NULL branch_id rows found in tables not on the approved-exception list: "
                            + violations + " — decide explicitly how to handle these before migrating.");
        }
    }

    // ── Tenant status / audit log ────────────────────────────────────────────────

    @Transactional("controlPlaneTransactionManager")
    protected void setTenantStatus(Long tenantId, String status) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        tenant.setStatus(status);
        tenantRepository.save(tenant);
    }

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
