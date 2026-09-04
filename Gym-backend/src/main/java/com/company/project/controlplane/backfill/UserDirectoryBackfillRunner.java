package com.company.project.controlplane.backfill;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.entities.UserDirectoryEntry;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * One-time, manually-triggered backfill of user_directory for users that already
 * exist in an already-migrated/provisioned tenant database but predate Phase 5's
 * directory-write step (TenantProvisioningService.writeDirectoryEntry only covers
 * NEW gyms created after this phase). Test Gym's 3 users, migrated in Phase 4
 * before this directory existed, are exactly this case. Disabled by default; run
 * once with:
 *   --user-directory.backfill.enabled=true
 * Idempotent: skips any username already present, so it is safe to re-run.
 * Iterates every Tenant with a real TenantConnection (not hardcoded to Test Gym),
 * so it also covers any future migration that predates a directory write.
 */
@Component
@ConditionalOnProperty(name = "user-directory.backfill.enabled", havingValue = "true")
public class UserDirectoryBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UserDirectoryBackfillRunner.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final UserDirectoryRepository userDirectoryRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    public UserDirectoryBackfillRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            UserDirectoryRepository userDirectoryRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.userDirectoryRepository = userDirectoryRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    @Override
    public void run(String... args) throws Exception {
        int copied = 0;
        for (Tenant tenant : tenantRepository.findAll()) {
            TenantConnection connection = tenantConnectionRepository.findByTenantId(tenant.getId()).orElse(null);
            if (connection == null) {
                continue;
            }
            copied += backfillTenant(tenant.getSlug());
        }
        log.info("UserDirectoryBackfillRunner: copied {} new user_directory row(s)", copied);
    }

    @Transactional("controlPlaneTransactionManager")
    protected int backfillTenant(String tenantSlug) throws Exception {
        int copied = 0;
        try (Connection conn = tenantDataSourceRegistry.getDataSource(tenantSlug).getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT username, email FROM users")) {
            while (rs.next()) {
                String username = rs.getString("username");
                if (userDirectoryRepository.existsByUsername(username)) {
                    continue;
                }
                String email = rs.getString("email");
                // A handful of pre-existing source rows have non-email junk in this
                // column (a known, unrelated data-quality issue predating this
                // migration) — falling back to username keeps the directory row
                // useful for username-based login lookups without inventing email
                // validation this backfill has no business doing.
                if (email == null || !email.contains("@")) {
                    email = username;
                }
                try {
                    userDirectoryRepository.save(new UserDirectoryEntry(username, email, tenantSlug));
                    copied++;
                } catch (Exception e) {
                    log.warn("Skipped user_directory row for username='{}' tenant='{}' — {}", username, tenantSlug, e.getMessage());
                }
            }
        }
        return copied;
    }
}
