package com.company.project.controlplane.backfill;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Applies V62__supplier_branch_scope.sql to every tenant database that still needs it.
 * Tenant Flyway rollout is opt-in (tenant.schema-migration.enabled), but Supplier is
 * now BranchAware, so a tenant without suppliers.branch_id populated would lose every
 * supplier from branch views. The script is idempotent; this runner only executes it
 * when the column is missing or some supplier still has no branch.
 */
@Component
@ConditionalOnProperty(name = "tenant.routing.enabled", havingValue = "true")
public class TenantSupplierBranchBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantSupplierBranchBackfillRunner.class);
    private static final String SCRIPT = "db/migration/V62__supplier_branch_scope.sql";

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    public TenantSupplierBranchBackfillRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    @Override
    public void run(String... args) throws Exception {
        String script = new String(new ClassPathResource(SCRIPT).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        for (Tenant tenant : tenantRepository.findAll()) {
            if (tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) {
                continue;
            }
            try {
                DataSource ds = tenantDataSourceRegistry.getDataSource(tenant.getSlug());
                try (Connection conn = ds.getConnection(); Statement stmt = conn.createStatement()) {
                    if (!needsBackfill(stmt)) {
                        continue;
                    }
                    stmt.execute(script);
                    log.info("Assigned suppliers to branches for tenant '{}'", tenant.getSlug());
                }
            } catch (Exception e) {
                log.error("Supplier branch backfill failed for tenant '{}'", tenant.getSlug(), e);
            }
        }
    }

    private static boolean needsBackfill(Statement stmt) throws Exception {
        try (ResultSet rs = stmt.executeQuery(
                "SELECT to_regclass('suppliers') IS NOT NULL, "
                        + "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() "
                        + "AND table_name = 'suppliers' AND column_name = 'branch_id')")) {
            rs.next();
            if (!rs.getBoolean(1)) return false;
            if (!rs.getBoolean(2)) return true;
        }
        try (ResultSet rs = stmt.executeQuery("SELECT EXISTS (SELECT 1 FROM suppliers WHERE branch_id IS NULL)")) {
            rs.next();
            return rs.getBoolean(1);
        }
    }
}
