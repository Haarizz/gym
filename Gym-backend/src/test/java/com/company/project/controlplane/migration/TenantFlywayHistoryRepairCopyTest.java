package com.company.project.controlplane.migration;

import com.company.project.controlplane.migration.FlywayHistoryInspector.LocalMigration;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Exercises TenantFlywayHistoryRepairRunner against a throwaway COPY of a real
 * tenant database — never a live one. Skipped unless explicitly pointed at a copy:
 *
 *   mvn test -Dtest=TenantFlywayHistoryRepairCopyTest \
 *     -Drepair.copy.db=repairtest_fitzone_gym -Drepair.copy.role=tenant_fitzone_gym \
 *     -Drepair.copy.password=...
 *
 * Connects as a superuser but SET ROLEs to the tenant's own role, so it runs with
 * the same privileges the real runner will.
 */
class TenantFlywayHistoryRepairCopyTest {

    @Test
    void repairsCopyAndLeavesHistoryConsistent() throws Exception {
        String db = System.getProperty("repair.copy.db");
        assumeTrue(db != null && db.startsWith("repairtest_"), "only runs against a repairtest_* copy");
        String role = System.getProperty("repair.copy.role");

        try (HikariDataSource ds = new HikariDataSource()) {
            ds.setJdbcUrl("jdbc:postgresql://localhost:5432/" + db);
            ds.setUsername(System.getProperty("repair.copy.user", "postgres"));
            ds.setPassword(System.getProperty("repair.copy.password"));
            ds.setConnectionInitSql("SET ROLE " + role);
            ds.setMaximumPoolSize(2);

            Map<MigrationVersion, LocalMigration> local = FlywayHistoryInspector.loadLocalMigrations();
            TenantFlywayHistoryRepairRunner runner = new TenantFlywayHistoryRepairRunner(null, null, null, null);

            // Dry run changes nothing.
            String before = historyFingerprint(ds);
            assertFalse(runner.repairTenant(ds, db, local, false));
            assertEquals(before, historyFingerprint(ds));

            // Apply.
            assertTrue(runner.repairTenant(ds, db, local, true));

            // History now matches the files that actually ran, and Flyway agrees.
            assertTrue(FlywayHistoryInspector.findRenumberedRows(FlywayHistoryInspector.readHistory(ds), local).isEmpty());
            Flyway.configure().dataSource(ds).ignoreMigrationPatterns("*:missing").load().validate();
            assertEquals(0, count(ds, "SELECT COUNT(*) FROM flyway_schema_history WHERE NOT success"));
            assertEquals(local.size(), count(ds, "SELECT COUNT(DISTINCT version) FROM flyway_schema_history "
                    + "WHERE version IN (" + local.values().stream().map(m -> "'" + m.versionText() + "'")
                    .reduce((a, b) -> a + "," + b).orElseThrow() + ")"));

            // Migrations that were previously only mislabelled now really exist.
            assertEquals(1, count(ds, "SELECT COUNT(*) FROM platform_modules WHERE module_key = 'BIOS'"));
            assertEquals(1, count(ds, "SELECT COUNT(*) FROM permissions WHERE permission_key = 'GYMOS_EDIT'"));
            assertTrue(count(ds, "SELECT COUNT(*) FROM gymos_settings") > 0);
            assertEquals(1, count(ds, "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'user_identity_providers'"));
            assertEquals(1, count(ds, "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'mobile_family_invitations'"));
            // Backup of the original history kept.
            assertTrue(count(ds, "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'flyway_schema_history_bak_%'") >= 1);

            // Second run: nothing left to do.
            assertFalse(runner.repairTenant(ds, db, local, true));
        }
    }

    private static String historyFingerprint(HikariDataSource ds) throws Exception {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT string_agg(installed_rank || ':' || coalesce(version,'') || ':' "
                     + "|| script || ':' || coalesce(checksum::text,''), '|' ORDER BY installed_rank) FROM flyway_schema_history")) {
            rs.next();
            return rs.getString(1);
        }
    }

    private static int count(HikariDataSource ds, String sql) throws Exception {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            rs.next();
            return rs.getInt(1);
        }
    }
}
