package com.company.project.controlplane.community.store;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * The single community_rollout_state row, the pilot allowlist, and the
 * append-only audit of every change. Updates are optimistic (version column)
 * and audited in the same transaction; the database itself rejects invalid
 * combinations and any GLOBAL → LEGACY move (V6 constraints and trigger).
 */
@Component
public class CommunityRolloutStore {

    /** Columns an operator may change through the generic flag update (special transitions are separate). */
    public static final Set<String> FLAG_COLUMNS = Set.of(
            "write_mode", "op_post", "op_comment", "op_like", "op_report", "global_reads", "moderation", "reports",
            "shadow_compare", "legacy_delta_sync", "mobile_surface", "web_surface",
            "platform_author_policy", "unregistered_gym_policy", "primary_member_login_policy", "null_branch_policy");

    public record State(String authority, String writeMode, boolean opPost, boolean opComment, boolean opLike,
                        boolean opReport, boolean globalReads, boolean moderation, boolean reports, boolean shadowCompare,
                        boolean legacyDeltaSync, String mobileSurface, String webSurface,
                        boolean productionBaselineAccepted, String platformAuthorPolicy, String unregisteredGymPolicy,
                        String primaryMemberLoginPolicy, String nullBranchPolicy, LocalDateTime authorityChangedAt,
                        LocalDateTime updatedAt, String updatedBy, int version, Set<String> allowlist) {

        public boolean isGlobalAuthority() {
            return "GLOBAL".equals(authority);
        }

        public Map<String, Object> asColumns() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("authority", authority);
            m.put("write_mode", writeMode);
            m.put("op_post", opPost);
            m.put("op_comment", opComment);
            m.put("op_like", opLike);
            m.put("op_report", opReport);
            m.put("global_reads", globalReads);
            m.put("moderation", moderation);
            m.put("reports", reports);
            m.put("shadow_compare", shadowCompare);
            m.put("legacy_delta_sync", legacyDeltaSync);
            m.put("mobile_surface", mobileSurface);
            m.put("web_surface", webSurface);
            m.put("production_baseline_accepted", productionBaselineAccepted);
            m.put("platform_author_policy", platformAuthorPolicy);
            m.put("unregistered_gym_policy", unregisteredGymPolicy);
            m.put("primary_member_login_policy", primaryMemberLoginPolicy);
            m.put("null_branch_policy", nullBranchPolicy);
            return m;
        }
    }

    public record AuditRow(long id, LocalDateTime changedAt, String changedBy, String field, String oldValue,
                           String newValue, String reason) {}

    private final CommunityDb db;

    public CommunityRolloutStore(CommunityDb db) {
        this.db = db;
    }

    public State load() {
        Set<String> allowlist = new TreeSet<>(db.jdbc().queryForList(
                "SELECT tenant_slug FROM community_rollout_allowlist", new MapSqlParameterSource(), String.class));
        return db.jdbc().queryForObject("SELECT * FROM community_rollout_state WHERE id = 1", new MapSqlParameterSource(),
                (rs, n) -> new State(rs.getString("authority"), rs.getString("write_mode"), rs.getBoolean("op_post"),
                        rs.getBoolean("op_comment"), rs.getBoolean("op_like"), rs.getBoolean("op_report"),
                        rs.getBoolean("global_reads"), rs.getBoolean("moderation"), rs.getBoolean("reports"),
                        rs.getBoolean("shadow_compare"), rs.getBoolean("legacy_delta_sync"), rs.getString("mobile_surface"),
                        rs.getString("web_surface"), rs.getBoolean("production_baseline_accepted"),
                        rs.getString("platform_author_policy"), rs.getString("unregistered_gym_policy"),
                        rs.getString("primary_member_login_policy"), rs.getString("null_branch_policy"),
                        rs.getTimestamp("authority_changed_at") == null ? null : rs.getTimestamp("authority_changed_at").toLocalDateTime(),
                        rs.getTimestamp("updated_at").toLocalDateTime(), rs.getString("updated_by"), rs.getInt("version"),
                        allowlist));
    }

    /**
     * Applies column changes if the row is still at {@code expectedVersion}, and
     * audits each changed column. Only whitelisted column names reach the SQL.
     *
     * @return false if someone else changed the state first
     */
    public boolean update(int expectedVersion, Map<String, Object> changes, String changedBy, String reason) {
        return db.inTransaction(() -> {
            State before = load();
            if (before.version() != expectedVersion) {
                return false;
            }
            Map<String, Object> current = before.asColumns();
            StringBuilder set = new StringBuilder();
            MapSqlParameterSource params = new MapSqlParameterSource("version", expectedVersion).addValue("by", changedBy);
            for (Map.Entry<String, Object> change : changes.entrySet()) {
                String column = change.getKey();
                if (!current.containsKey(column)) {
                    throw new IllegalArgumentException("Unknown rollout column " + column);
                }
                set.append(column).append(" = :").append(column).append(", ");
                params.addValue(column, change.getValue());
            }
            if ("GLOBAL".equals(changes.get("authority")) && !before.isGlobalAuthority()) {
                set.append("authority_changed_at = NOW(), ");
            }
            int updated = db.jdbc().update("UPDATE community_rollout_state SET " + set
                    + "updated_at = NOW(), updated_by = :by, version = version + 1 WHERE id = 1 AND version = :version", params);
            if (updated != 1) {
                return false;
            }
            for (Map.Entry<String, Object> change : changes.entrySet()) {
                Object old = current.get(change.getKey());
                if (!String.valueOf(old).equals(String.valueOf(change.getValue()))) {
                    audit(changedBy, change.getKey(), String.valueOf(old), String.valueOf(change.getValue()), reason);
                }
            }
            return true;
        });
    }

    public void addToAllowlist(String tenantSlug, String changedBy, String reason) {
        db.inTransaction(() -> {
            int added = db.jdbc().update("INSERT INTO community_rollout_allowlist (tenant_slug, added_by) VALUES (:slug, :by) "
                    + "ON CONFLICT (tenant_slug) DO NOTHING", new MapSqlParameterSource("slug", tenantSlug).addValue("by", changedBy));
            if (added == 1) {
                audit(changedBy, "allowlist", null, "+" + tenantSlug, reason);
            }
        });
    }

    public void removeFromAllowlist(String tenantSlug, String changedBy, String reason) {
        db.inTransaction(() -> {
            int removed = db.jdbc().update("DELETE FROM community_rollout_allowlist WHERE tenant_slug = :slug",
                    new MapSqlParameterSource("slug", tenantSlug));
            if (removed == 1) {
                audit(changedBy, "allowlist", "+" + tenantSlug, null, reason);
            }
        });
    }

    public void audit(String changedBy, String field, String oldValue, String newValue, String reason) {
        db.jdbc().update("INSERT INTO community_rollout_audit (changed_by, field, old_value, new_value, reason) "
                        + "VALUES (:by, :field, :old, :new, :reason)",
                new MapSqlParameterSource("by", changedBy).addValue("field", field).addValue("old", oldValue)
                        .addValue("new", newValue).addValue("reason", reason));
    }

    public List<AuditRow> recentAudit(int limit) {
        return db.jdbc().query("SELECT * FROM community_rollout_audit ORDER BY id DESC LIMIT :limit",
                new MapSqlParameterSource("limit", limit),
                (rs, n) -> new AuditRow(rs.getLong("id"), rs.getTimestamp("changed_at").toLocalDateTime(),
                        rs.getString("changed_by"), rs.getString("field"), rs.getString("old_value"),
                        rs.getString("new_value"), rs.getString("reason")));
    }

    /** Finish time of the most recent FINAL reconciliation, if its status was PASS (a later FAIL hides earlier passes). */
    public LocalDateTime latestFinalReconciliationPass() {
        List<Map<String, Object>> rows = db.jdbc().queryForList("SELECT status, finished_at FROM community_migration_runs "
                + "WHERE kind = 'RECONCILE' AND mode = 'FINAL' AND status <> 'RUNNING' ORDER BY id DESC LIMIT 1",
                new MapSqlParameterSource());
        if (rows.isEmpty() || !"PASS".equals(rows.get(0).get("status"))) {
            return null;
        }
        return ((java.sql.Timestamp) rows.get(0).get("finished_at")).toLocalDateTime();
    }

    /** When the current write freeze began (the latest audited switch to READ_ONLY), if one is in force. */
    public LocalDateTime writeFreezeStartedAt() {
        List<java.sql.Timestamp> ts = db.jdbc().queryForList("SELECT changed_at FROM community_rollout_audit "
                        + "WHERE field = 'write_mode' AND new_value = 'READ_ONLY' ORDER BY id DESC LIMIT 1",
                new MapSqlParameterSource(), java.sql.Timestamp.class);
        return ts.isEmpty() ? null : ts.get(0).toLocalDateTime();
    }
}
