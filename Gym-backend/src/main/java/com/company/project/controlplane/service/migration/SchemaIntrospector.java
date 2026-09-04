package com.company.project.controlplane.service.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 4: derives table scoping and copy order from the LIVE database schema at
 * runtime, rather than a hand-typed table list. This exists because two independent
 * hand-built inventories of "which tables are gym-scoped" were each found to be wrong
 * during design review of this same migration (FinancialSettings has a real branch_id
 * column but doesn't implement the BranchAware Java interface; WorkoutFeedback holds
 * gym-specific data via FKs but has no branch_id column and no BranchAware interface
 * at all). Querying information_schema directly is self-correcting against this whole
 * class of mistake and immune to future schema drift.
 */
public class SchemaIntrospector {

    public record ForeignKeyEdge(String childTable, String childColumn, String parentTable, String parentColumn) {}

    public record TablePrimaryKey(String tableName, String pkColumn, boolean isIdentity, boolean isComposite) {}

    /** Every table in the public schema with a real branch_id column — the authoritative Root set. */
    public Set<String> findBranchIdTables(Connection conn) throws SQLException {
        Set<String> tables = new LinkedHashSet<>();
        String sql = "SELECT table_name FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND column_name = 'branch_id' ORDER BY table_name";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                tables.add(rs.getString("table_name"));
            }
        }
        return tables;
    }

    /** The real FK graph (child table/column -> parent table/column), queried live. */
    public List<ForeignKeyEdge> findForeignKeyEdges(Connection conn) throws SQLException {
        List<ForeignKeyEdge> edges = new ArrayList<>();
        String sql = "SELECT tc.table_name AS child_table, kcu.column_name AS child_column, " +
                "ccu.table_name AS parent_table, ccu.column_name AS parent_column " +
                "FROM information_schema.table_constraints tc " +
                "JOIN information_schema.key_column_usage kcu " +
                "  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema " +
                "JOIN information_schema.constraint_column_usage ccu " +
                "  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema " +
                "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' " +
                "ORDER BY child_table, child_column";
        try (PreparedStatement ps = conn.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                edges.add(new ForeignKeyEdge(
                        rs.getString("child_table"),
                        rs.getString("child_column"),
                        rs.getString("parent_table"),
                        rs.getString("parent_column")
                ));
            }
        }
        return edges;
    }

    /**
     * Primary key column per table, plus whether it's an identity column (needed to
     * decide whether the copy step uses OVERRIDING SYSTEM VALUE + a sequence reset).
     * Tables with a composite primary key are reported with isComposite=true and no
     * single pkColumn value can be trusted for identity/setval purposes.
     */
    public Map<String, TablePrimaryKey> findPrimaryKeys(Connection conn) throws SQLException {
        Map<String, List<String>> pkColumnsByTable = new LinkedHashMap<>();
        String pkSql = "SELECT tc.table_name, kcu.column_name " +
                "FROM information_schema.table_constraints tc " +
                "JOIN information_schema.key_column_usage kcu " +
                "  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema " +
                "WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' " +
                "ORDER BY tc.table_name, kcu.ordinal_position";
        try (PreparedStatement ps = conn.prepareStatement(pkSql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                pkColumnsByTable.computeIfAbsent(rs.getString("table_name"), k -> new ArrayList<>())
                        .add(rs.getString("column_name"));
            }
        }

        Map<String, TablePrimaryKey> result = new LinkedHashMap<>();
        // Hibernate 6's schema-export for @GeneratedValue(strategy = IDENTITY) on
        // Postgres actually creates a classic "serial"-style column (bigint DEFAULT
        // nextval(...)), NOT a SQL-standard GENERATED ... AS IDENTITY column — so
        // information_schema.columns.is_identity is 'NO' for every such column in
        // every freshly-bootstrapped tenant database. Checking column_default for a
        // nextval(...) default (still resolved correctly by pg_get_serial_sequence)
        // is the real, dialect-agnostic signal for "does this column need
        // OVERRIDING SYSTEM VALUE + a setval reset after a bulk copy" — is_identity
        // alone would report false for literally every table copied by this engine,
        // as an earlier version of this method did (confirmed by a real sequence
        // going out of sync after Phase 4's migration, caught during Phase 5's own
        // end-to-end verification).
        String identitySql = "SELECT is_identity, column_default FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = ? AND column_name = ?";
        for (Map.Entry<String, List<String>> entry : pkColumnsByTable.entrySet()) {
            String table = entry.getKey();
            List<String> pkCols = entry.getValue();
            boolean composite = pkCols.size() > 1;
            String pkColumn = pkCols.get(0);
            boolean isIdentity = false;
            if (!composite) {
                try (PreparedStatement ps = conn.prepareStatement(identitySql)) {
                    ps.setString(1, table);
                    ps.setString(2, pkColumn);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            boolean realIdentity = "YES".equalsIgnoreCase(rs.getString("is_identity"));
                            String columnDefault = rs.getString("column_default");
                            boolean serialDefault = columnDefault != null && columnDefault.startsWith("nextval(");
                            isIdentity = realIdentity || serialDefault;
                        }
                    }
                }
            }
            result.put(table, new TablePrimaryKey(table, pkColumn, isIdentity, composite));
        }
        return result;
    }

    /**
     * flyway_schema_history is Flyway's own bookkeeping table, not application data —
     * every database (source and target alike) must keep its own independently-correct
     * migration history, so it is never a candidate for copying between them.
     */
    private static final String FLYWAY_HISTORY_TABLE = "flyway_schema_history";

    /** Every base table in the public schema (excluding Flyway's own bookkeeping table) — used to confirm the topo sort accounts for all of them. */
    public List<String> findAllTables(Connection conn) throws SQLException {
        List<String> tables = new ArrayList<>();
        String sql = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> ? ORDER BY tablename";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, FLYWAY_HISTORY_TABLE);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tables.add(rs.getString("tablename"));
                }
            }
        }
        return tables;
    }
}
