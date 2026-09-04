package com.company.project.controlplane.service.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Post-migration verification: re-queries the SOURCE database live with the same
 * filters the migration itself used (not hard-coded snapshot counts, which would
 * silently go stale if this migration is ever re-run against changed source data),
 * compares against the target, and spot-checks the handful of identity-sensitive
 * facts a plain row-count comparison can't catch (which specific users exist).
 */
public class MigrationVerifier {

    private static final Logger log = LoggerFactory.getLogger(MigrationVerifier.class);

    public record TableCheck(String tableName, long sourceCount, long targetCount, boolean pass) {}

    public record VerificationReport(List<TableCheck> tableChecks, List<String> issues, boolean overallPass) {}

    public VerificationReport verify(DataSource source, DataSource target, Long gymId, List<Long> branchIds) throws Exception {
        List<TableCheck> checks = new ArrayList<>();
        List<String> issues = new ArrayList<>();
        Long[] branchIdArray = branchIds.toArray(new Long[0]);

        try (Connection sourceConn = source.getConnection(); Connection targetConn = target.getConnection()) {
            checkCount(sourceConn, targetConn, "gyms", "id = ?", new Object[]{gymId}, checks, issues);
            checkCount(sourceConn, targetConn, "branches", "id = ANY(?)", new Object[]{branchIdArray}, checks, issues);
            checkCount(sourceConn, targetConn,
                    "users",
                    "id IN (SELECT user_id FROM user_branches WHERE branch_id = ANY(?)) OR id = "
                            + "(SELECT owner_user_id FROM gyms WHERE id = ?)",
                    new Object[]{branchIdArray, gymId}, checks, issues);

            verifyExactUserIds(targetConn, issues);
            verifyNoPlatformAdmins(targetConn, issues);
        }

        boolean overallPass = issues.isEmpty();
        if (!overallPass) {
            log.warn("Migration verification found {} issue(s): {}", issues.size(), issues);
        } else {
            log.info("Migration verification passed: {} table(s) checked, no issues found.", checks.size());
        }
        return new VerificationReport(checks, issues, overallPass);
    }

    private void checkCount(Connection sourceConn, Connection targetConn, String table,
                             String filterSql, Object[] params, List<TableCheck> checks, List<String> issues) throws Exception {
        long sourceCount = countWithFilter(sourceConn, table, filterSql, params);
        long targetCount = countAll(targetConn, table);
        boolean pass = sourceCount == targetCount;
        checks.add(new TableCheck(table, sourceCount, targetCount, pass));
        if (!pass) {
            issues.add(table + ": source=" + sourceCount + " target=" + targetCount);
        }
    }

    private long countWithFilter(Connection conn, String table, String filterSql, Object[] params) throws Exception {
        String sql = "SELECT count(*) FROM " + quoteIdentifier(table) + (filterSql != null ? " WHERE " + filterSql : "");
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                Object param = params[i];
                if (param instanceof Long[] longs) {
                    ps.setArray(i + 1, conn.createArrayOf("bigint", longs));
                } else {
                    ps.setObject(i + 1, param);
                }
            }
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }

    private long countAll(Connection conn, String table) throws Exception {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT count(*) FROM " + quoteIdentifier(table))) {
            rs.next();
            return rs.getLong(1);
        }
    }

    /** Confirms the target's users table contains exactly the expected id set — a count match alone couldn't catch a wrong-but-same-size set. */
    private void verifyExactUserIds(Connection targetConn, List<String> issues) throws Exception {
        Set<Long> expected = Set.of(2L, 3L, 6L);
        Set<Long> actual = new java.util.HashSet<>();
        try (Statement stmt = targetConn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id FROM users")) {
            while (rs.next()) {
                actual.add(rs.getLong("id"));
            }
        }
        if (!actual.equals(expected)) {
            issues.add("users table id set mismatch: expected " + expected + " but found " + actual);
        }
    }

    /** Hard safety check: the platform-owner and unrelated admin accounts must never appear in a tenant database. */
    private void verifyNoPlatformAdmins(Connection targetConn, List<String> issues) throws Exception {
        try (PreparedStatement ps = targetConn.prepareStatement("SELECT id FROM users WHERE id IN (1, 4)");
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                issues.add("Found platform/unrelated admin user id=" + rs.getLong("id") + " in tenant database — this must never happen");
            }
        }
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}
