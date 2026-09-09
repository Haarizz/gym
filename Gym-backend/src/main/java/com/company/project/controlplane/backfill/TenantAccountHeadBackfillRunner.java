package com.company.project.controlplane.backfill;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.TenantProvisioningService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * One-time, manually-triggered backfill of the standard Chart of Accounts
 * (TenantProvisioningService.seedDefaultAccountHeads) into every branch of every
 * already-provisioned tenant database. Disabled by default; run once with:
 *   --account-heads.backfill.enabled=true
 *
 * TenantProvisioningService only seeds the full chart for a tenant's initial branch,
 * at the moment it's first provisioned. Two gaps that leaves — both reproducing the
 * "Chart of Accounts screen shows only whichever accounts a transaction has already
 * touched" symptom that seeding was originally built to fix (see that method's own
 * doc comment):
 *   1. Tenants provisioned before that seeding step existed never got it at all
 *      (e.g. Power Gym: only Cash in Hand / Tax-GST Payable / Membership Revenue /
 *      Depreciation Expense existed — exactly the four codes real transactions had
 *      lazily auto-created via FinancialEventService.updateAccountBalance).
 *   2. Any branch added to a tenant AFTER its initial branch never got seeded either,
 *      since provisioning only ever seeds the one branch it creates.
 * Both are covered here by iterating every branch of every tenant DB, not just each
 * tenant's first one.
 *
 * Idempotent (ON CONFLICT DO NOTHING under the hood — see seedDefaultAccountHeads),
 * so it is safe to re-run. Mirrors UserDirectoryBackfillRunner: iterates every Tenant
 * with a real TenantConnection, not a hardcoded slug list, so it also covers any
 * future tenant that predates a later change to the standard chart.
 */
@Component
@ConditionalOnProperty(name = "account-heads.backfill.enabled", havingValue = "true")
public class TenantAccountHeadBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantAccountHeadBackfillRunner.class);

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final TenantProvisioningService tenantProvisioningService;

    public TenantAccountHeadBackfillRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry,
            TenantProvisioningService tenantProvisioningService) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.tenantProvisioningService = tenantProvisioningService;
    }

    @Override
    public void run(String... args) {
        int tenantsTouched = 0;
        int branchesSeeded = 0;
        for (Tenant tenant : tenantRepository.findAll()) {
            TenantConnection connection = tenantConnectionRepository.findByTenantId(tenant.getId()).orElse(null);
            if (connection == null) {
                continue;
            }
            try {
                int seeded = backfillTenant(tenant.getSlug());
                branchesSeeded += seeded;
                tenantsTouched++;
                log.info("Backfilled Chart of Accounts for tenant '{}' across {} branch(es)", tenant.getSlug(), seeded);
            } catch (Exception e) {
                log.error("Failed to backfill Chart of Accounts for tenant '{}'", tenant.getSlug(), e);
            }
        }
        log.info("TenantAccountHeadBackfillRunner: touched {} tenant(s), {} branch(es) total", tenantsTouched, branchesSeeded);
    }

    private int backfillTenant(String tenantSlug) throws Exception {
        DataSource tenantDs = tenantDataSourceRegistry.getDataSource(tenantSlug);
        List<Long> branchIds = new ArrayList<>();
        try (Connection conn = tenantDs.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id FROM branches")) {
            while (rs.next()) {
                branchIds.add(rs.getLong("id"));
            }
        }
        for (Long branchId : branchIds) {
            tenantProvisioningService.seedDefaultAccountHeads(tenantDs, branchId);
        }
        return branchIds.size();
    }
}
