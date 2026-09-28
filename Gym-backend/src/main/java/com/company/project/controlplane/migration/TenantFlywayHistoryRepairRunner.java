package com.company.project.controlplane.migration;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.entities.TenantProvisioningLog;
import com.company.project.controlplane.migration.FlywayHistoryInspector.HistoryRow;
import com.company.project.controlplane.migration.FlywayHistoryInspector.LocalMigration;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantProvisioningLogRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * One-off repair of tenant flyway_schema_history tables left inconsistent by
 * migration files being renumbered after tenants had run them, followed by an
 * unconditional flyway.repair() (TenantMigrationRunner) that relabelled those rows
 * with whichever NEW file now had the old number — e.g. a row whose script column
 * says V44__single_active_reward_rule.sql ran, but whose description/checksum now
 * claim V44__platform_modules.sql, which never ran.
 *
 * The script column is never touched by repair(), so it records what really ran.
 * For each tenant this runner:
 *  1. relabels every row to the version/description/checksum of the file it
 *     actually ran, following RENAMED (all renames were content-identical, R100);
 *     a row that turns out to be a second run of a migration another row already
 *     records (same file, same checksum) is removed instead of duplicated,
 *  2. marks a migration as applied only where it was applied by hand and every
 *     object it creates is present (APPLIED_BY_HAND),
 *  3. then runs the remaining migrations, allowing out-of-order ones only if they
 *     are known to be safe to re-run (SAFE_OUT_OF_ORDER).
 * Anything it can't prove — a failed row, an unknown renumbering, a conflict, a
 * partially-present migration, a tenant with no history table — aborts THAT
 * tenant untouched, with the reason logged.
 *
 * Dry run by default: prints the plan, changes nothing. Run with
 *   --tenant.history-repair.enabled=true [--tenant.history-repair.tenants=slug1,slug2]
 * and only after reviewing the plan add --tenant.history-repair.apply=true. Applying
 * first copies the history table to flyway_schema_history_bak_<timestamp>, and
 * rewrites it in a single transaction.
 */
@Component
@Order(0) // before TenantMigrationRunner, if both are enabled
@ConditionalOnProperty(name = "tenant.history-repair.enabled", havingValue = "true")
public class TenantFlywayHistoryRepairRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantFlywayHistoryRepairRunner.class);

    /** Every rename of an already-released migration file (old script -> new script), from git history. */
    static final Map<String, String> RENAMED = Map.ofEntries(
            // 0290371
            Map.entry("V34__add_mobile_discovery_fields_to_branches.sql", "V37__add_mobile_discovery_fields_to_branches.sql"),
            Map.entry("V35__add_global_user_id_to_members.sql", "V38__add_global_user_id_to_members.sql"),
            // 9d56cc4
            Map.entry("V42__add_photo_verification_to_referrals.sql", "V48__add_photo_verification_to_referrals.sql"),
            Map.entry("V43__bios_module.sql", "V49__bios_module.sql"),
            // ed74b4b
            Map.entry("V44__single_active_reward_rule.sql", "V50__single_active_reward_rule.sql"),
            Map.entry("V45__create_mobile_pending_registrations.sql", "V51__create_mobile_pending_registrations.sql"),
            Map.entry("V46__add_branch_discovery_config_fields.sql", "V52__add_branch_discovery_config_fields.sql"),
            Map.entry("V47__create_branch_images_and_reviews.sql", "V53__create_branch_images_and_reviews.sql"),
            Map.entry("V48__add_photo_verification_to_referrals.sql", "V54__add_photo_verification_to_referrals.sql"),
            Map.entry("V49__bios_module.sql", "V55__bios_module.sql"),
            // 3506211, 9c7dec9
            Map.entry("V42__add_mobile_referral_tables.sql", "V56__add_mobile_referral_tables.sql"),
            Map.entry("V56__add_mobile_referral_tables.sql", "V42.1__add_mobile_referral_tables.sql"),
            // release/prod-2026-09-28: main took V56 (ensure_mobile_referral_tables)
            Map.entry("V56__add_social_login_tables.sql", "V57__add_social_login_tables.sql"),
            Map.entry("V57__add_mobile_idempotency_and_invitations.sql", "V58__add_mobile_idempotency_and_invitations.sql"),
            Map.entry("V58__create_promotion_redemptions.sql", "V59__create_promotion_redemptions.sql")
    );

    /**
     * Older-than-latest migrations this runner may run out of order: verified to be
     * fully re-runnable (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, and
     * every INSERT guarded by WHERE NOT EXISTS), so they're safe even where
     * Hibernate's ddl-auto already created some of their tables.
     */
    static final Set<String> SAFE_OUT_OF_ORDER = Set.of("34", "35", "44", "45", "46", "47");

    /**
     * Migrations that may have been applied by hand, outside Flyway: a query
     * returning how many of the objects the migration creates exist, and how many
     * it creates. All present = record it as applied; none = let Flyway run it;
     * some = abort the tenant.
     */
    static final Map<String, String> APPLIED_BY_HAND = Map.of(
            "58", "SELECT (CASE WHEN to_regclass('mobile_idempotency_records') IS NOT NULL THEN 1 ELSE 0 END)"
                    + " + (CASE WHEN to_regclass('mobile_family_invitations') IS NOT NULL THEN 1 ELSE 0 END)"
                    + " + (CASE WHEN to_regclass('idx_family_invitations_token') IS NOT NULL THEN 1 ELSE 0 END)"
                    + " + (CASE WHEN to_regclass('idx_family_invitations_recipient') IS NOT NULL THEN 1 ELSE 0 END)"
                    + " + (CASE WHEN to_regclass('idx_members_global_user_id_unique') IS NOT NULL THEN 1 ELSE 0 END)"
    );
    private static final int APPLIED_BY_HAND_OBJECTS = 5;

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TenantProvisioningLogRepository provisioningLogRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    @Value("${tenant.history-repair.apply:false}")
    private boolean apply;

    @Value("${tenant.history-repair.tenants:}")
    private String tenantFilter;

    public TenantFlywayHistoryRepairRunner(TenantRepository tenantRepository,
                                           TenantConnectionRepository tenantConnectionRepository,
                                           TenantProvisioningLogRepository provisioningLogRepository,
                                           TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.provisioningLogRepository = provisioningLogRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    record Relabel(HistoryRow row, LocalMigration target) {}

    record Plan(List<Relabel> relabels, List<Relabel> duplicateRuns, List<LocalMigration> markApplied,
                List<LocalMigration> pending, List<LocalMigration> outOfOrder, List<HistoryRow> checksumDrift) {
        boolean isNoop() {
            return relabels.isEmpty() && duplicateRuns.isEmpty() && markApplied.isEmpty() && pending.isEmpty();
        }
    }

    static class PlanAbort extends Exception {
        PlanAbort(String message) { super(message); }
    }

    @Override
    public void run(String... args) throws Exception {
        Map<MigrationVersion, LocalMigration> local = FlywayHistoryInspector.loadLocalMigrations();
        Set<String> only = Arrays.stream(tenantFilter.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());

        log.info("HistoryRepair: {} — {} local migration(s){}", apply ? "APPLY" : "DRY RUN (nothing will be changed)",
                local.size(), only.isEmpty() ? "" : ", tenants " + only);

        for (Tenant tenant : tenantRepository.findAll()) {
            if (!only.isEmpty() && !only.contains(tenant.getSlug())) continue;
            if (tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) {
                log.info("HistoryRepair [{}]: SKIPPED — not provisioned (no TenantConnection)", tenant.getSlug());
                continue;
            }
            try {
                DataSource ds = tenantDataSourceRegistry.getDataSource(tenant.getSlug());
                if (repairTenant(ds, tenant.getSlug(), local, apply)) {
                    logStep(tenant.getId(), "SCHEMA_HISTORY_REPAIR", null);
                }
            } catch (PlanAbort e) {
                log.warn("HistoryRepair [{}]: ABORTED, nothing changed — {}", tenant.getSlug(), e.getMessage());
                if (apply) logStep(tenant.getId(), "SCHEMA_HISTORY_REPAIR", "Aborted: " + e.getMessage());
            } catch (Exception e) {
                log.error("HistoryRepair [{}]: FAILED", tenant.getSlug(), e);
                if (apply) logStep(tenant.getId(), "SCHEMA_HISTORY_REPAIR", e.getMessage());
            }
        }
        log.info("HistoryRepair: finished{}", apply ? "" : " (dry run — rerun with tenant.history-repair.apply=true to apply)");
    }

    /** Plans (and, if apply, performs) one tenant's repair. Returns whether anything was changed. */
    boolean repairTenant(DataSource ds, String label, Map<MigrationVersion, LocalMigration> local, boolean apply)
            throws Exception {
        Plan plan = plan(ds, local);
        logPlan(label, plan);
        if (!apply || plan.isNoop()) return false;

        String backup = rewriteHistory(ds, plan);
        log.info("HistoryRepair [{}]: history rewritten (previous copy in {})", label, backup);

        Flyway flyway = Flyway.configure()
                .dataSource(ds)
                .ignoreMigrationPatterns("*:missing")
                .outOfOrder(true)
                .load();
        if (!plan.checksumDrift().isEmpty()) {
            // Only now that no row is mislabelled is repair() safe: it can only
            // realign genuinely edited files' checksums.
            if (!FlywayHistoryInspector.findRenumberedRows(FlywayHistoryInspector.readHistory(ds), local).isEmpty()) {
                throw new IllegalStateException("history still has renumbered rows after rewrite");
            }
            flyway.repair();
        }
        int executed = flyway.migrate().migrationsExecuted;
        flyway.validate();
        log.info("HistoryRepair [{}]: DONE — {} migration(s) run, validation passed", label, executed);
        return true;
    }

    Plan plan(DataSource ds, Map<MigrationVersion, LocalMigration> local) throws Exception {
        if (!FlywayHistoryInspector.hasHistoryTable(ds)) {
            throw new PlanAbort("no flyway_schema_history — this schema wasn't built by Flyway and needs a manual audit");
        }
        // Migrations run as the tenant's own role, which can't alter tables some
        // other role (e.g. Hibernate's ddl-auto over a superuser connection) created.
        List<String> foreignOwned = strings(ds, "SELECT tablename || ' (owner ' || tableowner || ')' FROM pg_tables "
                + "WHERE schemaname = 'public' AND tableowner <> current_user ORDER BY tablename");
        if (!foreignOwned.isEmpty()) {
            throw new PlanAbort("tables not owned by the tenant role: " + String.join(", ", foreignOwned)
                    + " — as a superuser run ALTER TABLE <table> OWNER TO <tenant role> for each, then retry");
        }

        List<HistoryRow> history = FlywayHistoryInspector.readHistory(ds);
        Map<String, LocalMigration> byScript = new HashMap<>();
        local.values().forEach(m -> byScript.put(m.script(), m));

        for (HistoryRow row : history) {
            if (!row.success()) {
                throw new PlanAbort("failed migration recorded at rank " + row.installedRank() + " (" + row.script() + ")");
            }
        }

        // Prove our checksum calculation matches Flyway's on this tenant's untouched rows.
        List<HistoryRow> checksumDrift = new ArrayList<>();
        int verified = 0;
        for (HistoryRow row : history) {
            if (!"SQL".equals(row.type()) || row.version() == null) continue;
            LocalMigration same = byScript.get(row.script());
            if (same == null || !same.versionText().equals(row.version())) continue;
            if (Objects.equals(row.checksum(), same.checksum())) verified++;
            else checksumDrift.add(row);
        }
        if (verified == 0) {
            throw new PlanAbort("could not verify checksum calculation against any recorded migration");
        }

        List<Relabel> relabels = new ArrayList<>();
        for (HistoryRow row : history) {
            if (!"SQL".equals(row.type()) || row.version() == null) continue;
            String target = row.script();
            Set<String> seen = new HashSet<>();
            while (RENAMED.containsKey(target) && seen.add(target)) target = RENAMED.get(target);
            LocalMigration t = byScript.get(target);
            if (t == null) {
                // A file that no longer exists and no known rename. Harmless ("missing")
                // unless a different file now claims this version.
                if (local.containsKey(MigrationVersion.fromVersion(row.version()))) {
                    throw new PlanAbort("rank " + row.installedRank() + " ran " + row.script()
                            + ", which isn't a known rename of the current V" + row.version() + " file");
                }
                continue;
            }
            if (!target.equals(row.script()) || !t.versionText().equals(row.version())) {
                relabels.add(new Relabel(row, t));
            }
        }

        // Resulting applied versions must be unique. A relabel landing on a version
        // another row already records for the very same file and checksum is that
        // migration having run twice: drop the extra row rather than duplicate it.
        Map<String, String> appliedVersions = new HashMap<>(); // version -> script recorded for it
        Set<Integer> relabelled = relabels.stream().map(r -> r.row().installedRank()).collect(Collectors.toSet());
        for (HistoryRow row : history) {
            if (row.version() == null || relabelled.contains(row.installedRank())) continue;
            if (appliedVersions.putIfAbsent(row.version(), row.script()) != null) {
                throw new PlanAbort("V" + row.version() + " is recorded twice (rank " + row.installedRank() + ")");
            }
        }
        List<Relabel> duplicateRuns = new ArrayList<>();
        for (java.util.Iterator<Relabel> it = relabels.iterator(); it.hasNext(); ) {
            Relabel r = it.next();
            String existing = appliedVersions.putIfAbsent(r.target().versionText(), r.target().script());
            if (existing == null) continue;
            HistoryRow holder = history.stream()
                    .filter(h -> r.target().versionText().equals(h.version()) && !relabelled.contains(h.installedRank()))
                    .findFirst().orElse(null);
            boolean sameMigration = existing.equals(r.target().script()) && holder != null
                    && Objects.equals(holder.checksum(), r.target().checksum());
            if (!sameMigration) {
                throw new PlanAbort("rank " + r.row().installedRank() + " would become V" + r.target().versionText()
                        + ", which another row already records differently");
            }
            duplicateRuns.add(r);
            it.remove();
        }

        MigrationVersion maxApplied = appliedVersions.keySet().stream()
                .map(MigrationVersion::fromVersion).max(MigrationVersion::compareTo).orElse(MigrationVersion.EMPTY);

        List<LocalMigration> markApplied = new ArrayList<>();
        List<LocalMigration> pending = new ArrayList<>();
        List<LocalMigration> outOfOrder = new ArrayList<>();
        for (LocalMigration m : local.values()) {
            if (appliedVersions.containsKey(m.versionText())) continue;
            String marker = APPLIED_BY_HAND.get(m.versionText());
            if (marker != null) {
                int present = count(ds, marker);
                if (present == APPLIED_BY_HAND_OBJECTS) { markApplied.add(m); continue; }
                if (present > 0) {
                    throw new PlanAbort(m.script() + " is partially present (" + present + "/"
                            + APPLIED_BY_HAND_OBJECTS + " objects) — finish or undo it by hand first");
                }
            }
            if (m.version().compareTo(maxApplied) < 0) {
                if (!SAFE_OUT_OF_ORDER.contains(m.versionText())) {
                    throw new PlanAbort(m.script() + " was never applied and is older than V" + maxApplied
                            + ", and isn't known to be safe to run out of order");
                }
                outOfOrder.add(m);
            }
            pending.add(m);
        }
        return new Plan(relabels, duplicateRuns, markApplied, pending, outOfOrder, checksumDrift);
    }

    private String rewriteHistory(DataSource ds, Plan plan) throws Exception {
        String backup = "flyway_schema_history_bak_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        try (Connection c = ds.getConnection()) {
            c.setAutoCommit(false);
            try {
                try (Statement s = c.createStatement()) {
                    s.execute("CREATE TABLE " + backup + " AS TABLE flyway_schema_history");
                }
                try (PreparedStatement ps = c.prepareStatement(
                        "UPDATE flyway_schema_history SET version = ?, description = ?, script = ?, checksum = ? "
                                + "WHERE installed_rank = ? AND script = ?")) {
                    for (Relabel r : plan.relabels()) {
                        ps.setString(1, r.target().versionText());
                        ps.setString(2, r.target().description());
                        ps.setString(3, r.target().script());
                        ps.setInt(4, r.target().checksum());
                        ps.setInt(5, r.row().installedRank());
                        ps.setString(6, r.row().script());
                        if (ps.executeUpdate() != 1) {
                            throw new IllegalStateException("history changed underneath us at rank " + r.row().installedRank());
                        }
                    }
                }
                try (PreparedStatement ps = c.prepareStatement(
                        "DELETE FROM flyway_schema_history WHERE installed_rank = ? AND script = ?")) {
                    for (Relabel r : plan.duplicateRuns()) {
                        ps.setInt(1, r.row().installedRank());
                        ps.setString(2, r.row().script());
                        if (ps.executeUpdate() != 1) {
                            throw new IllegalStateException("history changed underneath us at rank " + r.row().installedRank());
                        }
                    }
                }
                try (PreparedStatement ps = c.prepareStatement(
                        "INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, "
                                + "installed_by, installed_on, execution_time, success) "
                                + "SELECT MAX(installed_rank) + 1, ?, ?, 'SQL', ?, ?, 'history-repair', NOW(), 0, TRUE "
                                + "FROM flyway_schema_history")) {
                    for (LocalMigration m : plan.markApplied()) {
                        ps.setString(1, m.versionText());
                        ps.setString(2, m.description());
                        ps.setString(3, m.script());
                        ps.setInt(4, m.checksum());
                        ps.executeUpdate();
                    }
                }
                c.commit();
            } catch (Exception e) {
                c.rollback();
                throw e;
            }
        }
        return backup;
    }

    private void logPlan(String slug, Plan plan) {
        if (plan.isNoop()) {
            log.info("HistoryRepair [{}]: history consistent, nothing to do", slug);
            return;
        }
        log.info("HistoryRepair [{}]: plan:", slug);
        for (Relabel r : plan.relabels()) {
            log.info("  relabel rank {}: ran {} — recorded as V{} \"{}\" -> V{} \"{}\"", r.row().installedRank(),
                    r.row().script(), r.row().version(), r.row().description(),
                    r.target().versionText(), r.target().description());
        }
        for (Relabel r : plan.duplicateRuns()) {
            log.info("  remove rank {}: ran {} (= {}) a second time — V{} is already recorded by another row",
                    r.row().installedRank(), r.row().script(), r.target().script(), r.target().versionText());
        }
        for (LocalMigration m : plan.markApplied()) {
            log.info("  mark applied (all objects already present): {}", m.script());
        }
        for (LocalMigration m : plan.pending()) {
            log.info("  run{}: {}", plan.outOfOrder().contains(m) ? " (out of order, re-runnable)" : "", m.script());
        }
        for (HistoryRow row : plan.checksumDrift()) {
            log.info("  note: {} edited since it ran (checksum drift) — checksum realigned by repair()", row.script());
        }
    }

    private static List<String> strings(DataSource ds, String sql) throws Exception {
        List<String> result = new ArrayList<>();
        try (Connection c = ds.getConnection(); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) result.add(rs.getString(1));
        }
        return result;
    }

    private static int count(DataSource ds, String sql) throws Exception {
        try (Connection c = ds.getConnection(); Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            rs.next();
            return rs.getInt(1);
        }
    }

    private void logStep(Long tenantId, String step, String errorMessage) {
        TenantProvisioningLog entry = new TenantProvisioningLog();
        entry.setTenantId(tenantId);
        entry.setStep(step);
        entry.setErrorMessage(errorMessage);
        entry.setAttemptedAt(LocalDateTime.now());
        provisioningLogRepository.save(entry);
    }
}
