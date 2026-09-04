package com.company.project.controlplane.service.migration;

import com.company.project.controlplane.service.migration.SchemaIntrospector.TablePrimaryKey;
import com.company.project.controlplane.service.migration.TenantTableGraph.ClassifiedTable;
import com.company.project.controlplane.service.migration.TenantTableGraph.TableKind;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Generic per-table copy mechanics, identical regardless of whether a table is ROOT,
 * SCOPED, or GLOBAL — this uniformity is what makes the whole migration engine
 * generic rather than hand-typed per table. Column names are discovered dynamically
 * via ResultSetMetaData, never hand-typed, so this stays correct even if a table's
 * shape changes later.
 *
 * Two tables (notifications, financial_settings) are known, explicitly-approved
 * exceptions where NULL branch_id rows are migrated alongside the branch-matched
 * ones — see NULL_INCLUSIVE_ROOT_TABLES.
 */
public class TableCopyEngine {

    private static final Logger log = LoggerFactory.getLogger(TableCopyEngine.class);

    private static final Set<String> NULL_INCLUSIVE_ROOT_TABLES = Set.of("notifications", "financial_settings");

    /** salary_payment_employees has no DB-level scoping mechanism (see BridgeEdges' doc comment) — copied in full as GLOBAL, explicitly logged so this isn't mistaken for an oversight. */
    private static final Set<String> GLOBAL_TABLES_WORTH_NOTING = Set.of("salary_payment_employees");

    /**
     * Flyway migration V11 backfills NULL currency_code -> 'AED' and then sets the
     * column NOT NULL — but V11 was never actually applied to the live source
     * database (confirmed absent from its flyway_schema_history), so account_heads
     * (24/24 rows) and journal_vouchers (4/8 rows) still hold NULL currency_code
     * there. The freshly-bootstrapped target DB correctly runs V11, so a raw copy of
     * these NULLs violates its NOT NULL constraint. This map reproduces exactly what
     * V11 itself already does, applied only to the specific column/table pairs
     * verified to need it — not a generic "coerce any null" mechanism, since that
     * would risk silently masking a real, different data problem elsewhere.
     */
    private static final Map<String, String> KNOWN_NULL_BACKFILL_COLUMNS = Map.of(
            "account_heads", "currency_code",
            "journal_vouchers", "currency_code"
    );
    private static final Object KNOWN_NULL_BACKFILL_VALUE = "AED";

    public record CopyResult(String tableName, int sourceRowCount, int targetRowCount) {}

    public List<CopyResult> copyAll(
            DataSource source,
            DataSource target,
            List<ClassifiedTable> order,
            Long gymId,
            List<Long> branchIds,
            Map<String, TablePrimaryKey> primaryKeys,
            Map<String, Set<Long>> seedTableIdSets
    ) throws SQLException {
        List<CopyResult> results = new ArrayList<>();
        // Seeded upfront with the seed tables' (gyms/branches/users) already-copied id
        // sets, so a child scoped directly by a seed table — e.g. user_roles.user_id
        // -> users — filters correctly instead of finding an empty set and being
        // wrongly skipped. See TenantTableGraph's doc comment on why seed tables'
        // edges are kept in the graph despite the tables themselves being pre-copied.
        Map<String, Set<Long>> copiedIdSets = new HashMap<>(seedTableIdSets);

        try (Connection sourceConn = source.getConnection(); Connection targetConn = target.getConnection()) {
            for (ClassifiedTable ct : order) {
                String table = ct.tableName();
                String filterSql;
                Object[] filterParams;

                if (ct.kind() == TableKind.ROOT) {
                    if (NULL_INCLUSIVE_ROOT_TABLES.contains(table)) {
                        filterSql = "branch_id = ANY(?) OR branch_id IS NULL";
                    } else {
                        filterSql = "branch_id = ANY(?)";
                    }
                    filterParams = new Object[]{branchIds.toArray(new Long[0])};
                } else if (ct.kind() == TableKind.SCOPED) {
                    Set<Long> parentIds = copiedIdSets.get(ct.scopingEdge().parentTable());
                    if (parentIds == null || parentIds.isEmpty()) {
                        log.info("Skipping {} — its scoping parent {} has no copied rows", table, ct.scopingEdge().parentTable());
                        results.add(new CopyResult(table, 0, 0));
                        continue;
                    }
                    filterSql = ct.scopingEdge().childColumn() + " = ANY(?)";
                    filterParams = new Object[]{parentIds.toArray(new Long[0])};
                } else {
                    if (GLOBAL_TABLES_WORTH_NOTING.contains(table)) {
                        log.info("{} has no DB-level scoping mechanism — copying in full as global reference data", table);
                    }
                    filterSql = null;
                    filterParams = new Object[0];
                }

                CopyResult result = copyTable(sourceConn, targetConn, table, filterSql, filterParams,
                        primaryKeys.get(table), copiedIdSets);
                results.add(result);
            }
        }
        return results;
    }

    /** Explicit seed-row copy for gyms/branches/users — same underlying mechanism, exact WHERE clause supplied by the caller. */
    public CopyResult copySeedTable(
            DataSource source, DataSource target, String table, String whereSql, Object[] whereParams,
            TablePrimaryKey pk, Map<String, Set<Long>> copiedIdSets
    ) throws SQLException {
        try (Connection sourceConn = source.getConnection(); Connection targetConn = target.getConnection()) {
            return copyTable(sourceConn, targetConn, table, whereSql, whereParams, pk, copiedIdSets);
        }
    }

    private CopyResult copyTable(
            Connection sourceConn, Connection targetConn, String table,
            String filterSql, Object[] filterParams, TablePrimaryKey pk,
            Map<String, Set<Long>> copiedIdSets
    ) throws SQLException {
        String selectSql = "SELECT * FROM " + quoteIdentifier(table)
                + (filterSql != null ? " WHERE " + filterSql : "");

        List<Map<String, Object>> rows = new ArrayList<>();
        List<String> columns = new ArrayList<>();
        try (PreparedStatement ps = sourceConn.prepareStatement(selectSql)) {
            bindParams(sourceConn, ps, filterParams);
            try (ResultSet rs = ps.executeQuery()) {
                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();
                if (columns.isEmpty()) {
                    for (int i = 1; i <= colCount; i++) {
                        columns.add(meta.getColumnName(i));
                    }
                }
                String backfillColumn = KNOWN_NULL_BACKFILL_COLUMNS.get(table);
                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    for (String col : columns) {
                        row.put(col, rs.getObject(col));
                    }
                    if (backfillColumn != null && row.get(backfillColumn) == null) {
                        row.put(backfillColumn, KNOWN_NULL_BACKFILL_VALUE);
                        log.info("Backfilled NULL {}.{} -> '{}' for a row not reached by Flyway V11 on the source database",
                                table, backfillColumn, KNOWN_NULL_BACKFILL_VALUE);
                    }
                    rows.add(row);
                }
            }
        }

        int targetCount = 0;
        Set<Long> insertedIds = new HashSet<>();
        if (!rows.isEmpty()) {
            boolean useOverriding = pk != null && pk.isIdentity();
            String colList = columns.stream().map(this::quoteIdentifier).collect(Collectors.joining(", "));
            String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
            String insertSql = "INSERT INTO " + quoteIdentifier(table) + " (" + colList + ") "
                    + (useOverriding ? "OVERRIDING SYSTEM VALUE " : "")
                    + "VALUES (" + placeholders + ")";

            try (PreparedStatement ps = targetConn.prepareStatement(insertSql)) {
                int batchCount = 0;
                for (Map<String, Object> row : rows) {
                    for (int i = 0; i < columns.size(); i++) {
                        ps.setObject(i + 1, row.get(columns.get(i)));
                    }
                    ps.addBatch();
                    batchCount++;
                    if (pk != null && !pk.isComposite() && row.get(pk.pkColumn()) instanceof Number n) {
                        insertedIds.add(n.longValue());
                    }
                    if (batchCount % 500 == 0) {
                        ps.executeBatch();
                    }
                }
                ps.executeBatch();
            }
            targetCount = rows.size();

            if (pk != null && pk.isIdentity()) {
                try (Statement stmt = targetConn.createStatement()) {
                    stmt.execute("SELECT setval(pg_get_serial_sequence('" + table + "','" + pk.pkColumn() + "'), "
                            + "COALESCE((SELECT MAX(" + quoteIdentifier(pk.pkColumn()) + ") FROM " + quoteIdentifier(table) + "), 1))");
                }
            }
        }

        copiedIdSets.put(table, insertedIds);
        return new CopyResult(table, rows.size(), targetCount);
    }

    // Long[]/Object[] params bind as a real Postgres ARRAY (for "col = ANY(?)" filters);
    // anything else binds as a plain scalar via setObject.
    private void bindParams(Connection conn, PreparedStatement ps, Object[] params) throws SQLException {
        for (int i = 0; i < params.length; i++) {
            Object param = params[i];
            if (param instanceof Long[] longs) {
                ps.setArray(i + 1, conn.createArrayOf("bigint", longs));
            } else if (param instanceof Object[] objs) {
                ps.setArray(i + 1, conn.createArrayOf("bigint", objs));
            } else {
                ps.setObject(i + 1, param);
            }
        }
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}
