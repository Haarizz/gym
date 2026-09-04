package com.company.project.controlplane.migration;

import com.company.project.controlplane.service.TenantDataMigrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * One-time, manually-triggered migration of an existing gym's real data (primary DB)
 * into its own dedicated tenant database. Disabled by default; run once with:
 *   --tenant.migration.enabled=true --tenant.migration.gym-id=1
 * (or TENANT_MIGRATION_ENABLED/TENANT_MIGRATION_GYM_ID as env vars).
 * Mirrors TenantBackfillRunner's gated-CommandLineRunner pattern: a permanent REST
 * endpoint would stay reachable indefinitely for what is, for any given gym, a
 * one-time operation.
 */
@Component
@ConditionalOnProperty(name = "tenant.migration.enabled", havingValue = "true")
public class TenantDataMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantDataMigrationRunner.class);

    private final TenantDataMigrationService tenantDataMigrationService;

    @Value("${tenant.migration.gym-id}")
    private Long gymId;

    public TenantDataMigrationRunner(TenantDataMigrationService tenantDataMigrationService) {
        this.tenantDataMigrationService = tenantDataMigrationService;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("TenantDataMigrationRunner: starting migration for gymId={}", gymId);
        tenantDataMigrationService.migrateExistingGym(gymId);
        log.info("TenantDataMigrationRunner: migration finished for gymId={}", gymId);
    }
}
