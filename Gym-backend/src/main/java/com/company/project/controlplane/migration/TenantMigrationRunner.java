package com.company.project.controlplane.migration;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.entities.TenantProvisioningLog;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantProvisioningLogRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.List;

/**
 * One-time, manually-triggered rollout of new Flyway migrations to EVERY already-
 * provisioned tenant database. Disabled by default; run once with:
 *   --tenant.schema-migration.enabled=true
 * Distinct from tenant.migration.* / TenantDataMigrationRunner, which is an
 * unrelated Phase-4 one-gym DATA migration (moving one gym's existing rows into
 * its own database) — this runner instead re-applies the SCHEMA migration chain
 * (db/migration/) to every tenant database that already has one, picking up
 * whatever new V<N>__....sql files were added after that tenant was provisioned.
 * Nothing in the existing provisioning flow does this automatically: Flyway only
 * ever runs once, at a tenant's own creation/migration time.
 *
 * Continue-on-error per tenant: one tenant's failure (a bad connection, a
 * migration that doesn't apply cleanly) must not block the rest from getting the
 * rollout. Every tenant's outcome is logged to tenant_provisioning_log, reusing
 * the existing entity/repository as-is, so a failed rollout is visible in the same
 * place as every other provisioning-related event for that tenant.
 *
 * Flyway is safe to call .migrate() again against an already-migrated database:
 * baselineOnMigrate only takes effect when no flyway_schema_history table exists
 * yet (never true here, since every tenant already has one from its own
 * provisioning), and .migrate() itself only applies migrations with a version
 * higher than the highest already recorded — a no-op if there's nothing new.
 */
@Component
@ConditionalOnProperty(name = "tenant.schema-migration.enabled", havingValue = "true")
public class TenantMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantMigrationRunner.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantProvisioningLogRepository provisioningLogRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    public TenantMigrationRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            TenantProvisioningLogRepository provisioningLogRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.provisioningLogRepository = provisioningLogRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    @Override
    public void run(String... args) {
        List<Tenant> tenants = tenantRepository.findAll();
        log.info("TenantMigrationRunner: starting schema migration rollout for {} tenant(s)", tenants.size());

        int migrated = 0;
        int skipped = 0;
        int failed = 0;
        for (Tenant tenant : tenants) {
            TenantConnection connection = tenantConnectionRepository.findByTenantId(tenant.getId()).orElse(null);
            if (connection == null) {
                log.info("TenantMigrationRunner: skipping tenant '{}' — not yet provisioned/migrated (no TenantConnection)", tenant.getSlug());
                skipped++;
                continue;
            }
            try {
                DataSource tenantDs = tenantDataSourceRegistry.getDataSource(tenant.getSlug());
                Flyway flyway = Flyway.configure().dataSource(tenantDs).load();
                var result = flyway.migrate();
                log.info("TenantMigrationRunner: tenant '{}' — {} migration(s) applied", tenant.getSlug(), result.migrationsExecuted);
                logStep(tenant.getId(), "SCHEMA_MIGRATION_ROLLOUT", null);
                migrated++;
            } catch (Exception e) {
                log.error("TenantMigrationRunner: schema migration rollout FAILED for tenant '{}'", tenant.getSlug(), e);
                logStep(tenant.getId(), "SCHEMA_MIGRATION_ROLLOUT", e.getMessage());
                failed++;
            }
        }

        log.info("TenantMigrationRunner: rollout complete — {} migrated, {} skipped (not provisioned), {} failed", migrated, skipped, failed);
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
