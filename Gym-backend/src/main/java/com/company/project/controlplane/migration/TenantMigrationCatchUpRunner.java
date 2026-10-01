package com.company.project.controlplane.migration;

import com.company.project.controlplane.service.TenantProvisioningService;
import com.company.project.controlplane.service.TenantProvisioningService.TenantMigrationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Runs TenantProvisioningService.catchUpTenantMigrations on every boot, so a deploy
 * that adds a V<N>__ migration reaches every tenant database without anyone having
 * to remember POST /api/gyms/catch-up-migrations. The primary DB's Flyway (and
 * Hibernate ddl-auto=update) only ever touch the primary database; before this, a
 * tenant stayed on its provisioning-time schema until that endpoint was called, and
 * every query touching a newer column 500'd for that gym (the V52 login outage).
 *
 * Same code path as the endpoint: per-tenant, continue-on-error, idempotent — a
 * tenant with nothing pending is a no-op. Failures are logged, never thrown, so one
 * broken tenant can't stop the app from starting. On by default; opt out with
 * TENANT_SCHEMA_CATCH_UP_ON_STARTUP=false.
 *
 * Order(1): after TenantFlywayHistoryRepairRunner (Order(0)) if that's enabled, and
 * before the unordered tenant backfill runners, which assume an up-to-date schema.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "tenant.schema-migration.catch-up-on-startup", havingValue = "true", matchIfMissing = true)
public class TenantMigrationCatchUpRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantMigrationCatchUpRunner.class);

    private final TenantProvisioningService tenantProvisioningService;

    public TenantMigrationCatchUpRunner(TenantProvisioningService tenantProvisioningService) {
        this.tenantProvisioningService = tenantProvisioningService;
    }

    @Override
    public void run(String... args) {
        List<TenantMigrationResult> results;
        try {
            results = tenantProvisioningService.catchUpTenantMigrations();
        } catch (Exception e) {
            log.error("Tenant migration catch-up on startup failed before reaching any tenant", e);
            return;
        }
        long failed = results.stream().filter(r -> !r.success()).count();
        for (TenantMigrationResult r : results) {
            if (!r.success()) {
                log.error("Tenant migration catch-up on startup FAILED for tenant '{}': {}", r.tenantSlug(), r.error());
            }
        }
        log.info("Tenant migration catch-up on startup: {} tenant(s) checked, {} failed", results.size(), failed);
    }
}
