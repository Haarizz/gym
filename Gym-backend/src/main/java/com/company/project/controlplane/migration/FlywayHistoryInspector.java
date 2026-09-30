package com.company.project.controlplane.migration;

import org.flywaydb.core.api.MigrationVersion;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.CRC32;

/**
 * Reads a tenant's flyway_schema_history and the db/migration files on the
 * classpath, so tenant schema tooling can see which file each history row
 * actually ran (its "script" column) versus which file now carries that version.
 *
 * Those diverge when migrations get renumbered after tenants ran them — and
 * Flyway's own repair() then silently rewrites the row's description/checksum to
 * the NEW file at that version, making the history claim a migration ran when it
 * didn't (see TenantFlywayHistoryRepairRunner).
 */
public final class FlywayHistoryInspector {

    private static final Pattern FILE_NAME = Pattern.compile("^V([0-9][0-9._]*)__(.+)\\.sql$");

    private FlywayHistoryInspector() {}

    public record LocalMigration(MigrationVersion version, String versionText, String description,
                                 String script, int checksum) {}

    public record HistoryRow(int installedRank, String version, String description, String type,
                             String script, Integer checksum, boolean success) {}

    /**
     * Runs flyway.repair() — realigning checksums of migration files edited after they ran
     * (e.g. gaining an IF NOT EXISTS guard) — but only when no history row was run from a
     * since-renumbered file, where repair() would instead relabel that row as a migration
     * that never ran. In that case it does nothing, so migrate() fails loudly exactly as
     * before and TenantFlywayHistoryRepairRunner remains the fix. Never executes SQL.
     *
     * @return true if repair() ran
     */
    public static boolean repairIfSafe(org.flywaydb.core.Flyway flyway, DataSource ds) throws IOException, SQLException {
        if (hasHistoryTable(ds) && !findRenumberedRows(readHistory(ds), loadLocalMigrations()).isEmpty()) {
            return false;
        }
        flyway.repair();
        return true;
    }

    /** db/migration/V*.sql by version, with Flyway-compatible descriptions and checksums. */
    public static Map<MigrationVersion, LocalMigration> loadLocalMigrations() throws IOException {
        Map<MigrationVersion, LocalMigration> result = new TreeMap<>();
        Resource[] resources = new PathMatchingResourcePatternResolver()
                .getResources("classpath*:db/migration/V*.sql");
        for (Resource resource : resources) {
            String name = resource.getFilename();
            Matcher m = name == null ? null : FILE_NAME.matcher(name);
            if (m == null || !m.matches()) continue;
            String versionText = m.group(1).replace('_', '.');
            MigrationVersion version = MigrationVersion.fromVersion(versionText);
            String description = m.group(2).replace('_', ' ');
            result.put(version, new LocalMigration(version, versionText, description, name, checksum(resource)));
        }
        return result;
    }

    /**
     * Same algorithm as Flyway's ChecksumCalculator: CRC32 over each line's UTF-8
     * bytes, line terminators excluded, a leading BOM stripped. Callers verify it
     * against the checksums a tenant's history already holds before trusting it.
     */
    static int checksum(Resource resource) throws IOException {
        CRC32 crc = new CRC32();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first && line.startsWith("﻿")) line = line.substring(1);
                first = false;
                crc.update(line.getBytes(StandardCharsets.UTF_8));
            }
        }
        return (int) crc.getValue();
    }

    public static boolean hasHistoryTable(DataSource ds) throws SQLException {
        try (Connection c = ds.getConnection();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT to_regclass('flyway_schema_history') IS NOT NULL")) {
            rs.next();
            return rs.getBoolean(1);
        }
    }

    public static List<HistoryRow> readHistory(DataSource ds) throws SQLException {
        List<HistoryRow> rows = new ArrayList<>();
        try (Connection c = ds.getConnection();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT installed_rank, version, description, type, script, checksum, success "
                     + "FROM flyway_schema_history ORDER BY installed_rank")) {
            while (rs.next()) {
                Integer checksum = rs.getObject(6) == null ? null : rs.getInt(6);
                rows.add(new HistoryRow(rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), checksum, rs.getBoolean(7)));
            }
        }
        return Collections.unmodifiableList(rows);
    }

    /**
     * SQL-migration rows whose recorded script is not the file that now carries the
     * same version — the rows Flyway's repair() would wrongly realign.
     */
    public static List<HistoryRow> findRenumberedRows(List<HistoryRow> history,
                                                      Map<MigrationVersion, LocalMigration> local) {
        List<HistoryRow> result = new ArrayList<>();
        for (HistoryRow row : history) {
            if (row.version() == null || !"SQL".equals(row.type())) continue;
            LocalMigration atVersion = local.get(MigrationVersion.fromVersion(row.version()));
            if (atVersion != null && !atVersion.script().equals(row.script())) {
                result.add(row);
            }
        }
        return result;
    }
}
