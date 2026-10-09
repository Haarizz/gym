package com.company.project.controlplane.community.store;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * The append-only moderation log and user reports. Reports store the gyms that
 * own the reported content at report time, so routing never depends on the
 * reporter's or moderator's currently selected gym.
 */
@Component
public class CommunityModerationStore {

    public record ReportRow(long id, String targetType, long targetId, long reporterAuthorId, String reason,
                            String details, String targetAuthorTenantSlug, String contextTenantSlug, String status,
                            Long resolvedByAuthorId, String resolvedScope, LocalDateTime resolvedAt, LocalDateTime createdAt) {}

    public record NewReport(String targetType, long targetId, long reporterAuthorId, String reason, String details,
                            String targetAuthorTenantSlug, String contextTenantSlug) {}

    private static final RowMapper<ReportRow> REPORT = (rs, n) -> new ReportRow(
            rs.getLong("id"), rs.getString("target_type"), rs.getLong("target_id"), rs.getLong("reporter_author_id"),
            rs.getString("reason"), rs.getString("details"), rs.getString("target_author_tenant_slug"),
            rs.getString("context_tenant_slug"), rs.getString("status"), (Long) rs.getObject("resolved_by_author_id"),
            rs.getString("resolved_scope"),
            rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toLocalDateTime(),
            rs.getTimestamp("created_at").toLocalDateTime());

    private final CommunityDb db;

    public CommunityModerationStore(CommunityDb db) {
        this.db = db;
    }

    public void recordAction(String targetType, long targetId, String action, String scope, long actorAuthorId,
                             String actorTenantSlug, String reason) {
        db.jdbc().update("INSERT INTO community_moderation_actions (target_type, target_id, action, scope, actor_author_id, "
                        + "actor_tenant_slug, reason) VALUES (:targetType, :targetId, :action, :scope, :actor, :slug, :reason)",
                new MapSqlParameterSource("targetType", targetType).addValue("targetId", targetId).addValue("action", action)
                        .addValue("scope", scope).addValue("actor", actorAuthorId).addValue("slug", actorTenantSlug)
                        .addValue("reason", reason));
    }

    /** @return the new report's id, or empty if this reporter already reported this target */
    public Optional<Long> insertReport(NewReport r) {
        List<Long> ids = db.jdbc().queryForList("INSERT INTO community_reports (target_type, target_id, reporter_author_id, "
                        + "reason, details, target_author_tenant_slug, context_tenant_slug) VALUES (:type, :targetId, :reporter, "
                        + ":reason, :details, :targetGym, :contextGym) "
                        + "ON CONFLICT (target_type, target_id, reporter_author_id) DO NOTHING RETURNING id",
                new MapSqlParameterSource("type", r.targetType()).addValue("targetId", r.targetId())
                        .addValue("reporter", r.reporterAuthorId()).addValue("reason", r.reason()).addValue("details", r.details())
                        .addValue("targetGym", r.targetAuthorTenantSlug()).addValue("contextGym", r.contextTenantSlug()),
                Long.class);
        return ids.stream().findFirst();
    }

    public Optional<ReportRow> findReport(long id) {
        return db.jdbc().query("SELECT * FROM community_reports WHERE id = :id", new MapSqlParameterSource("id", id), REPORT)
                .stream().findFirst();
    }

    /** Reports a gym is responsible for: against its members' content, or on its members' posts. */
    public List<ReportRow> reportsForGym(String tenantSlug, Collection<String> statuses, int limit) {
        return db.jdbc().query("SELECT * FROM community_reports WHERE status IN (:statuses) "
                        + "AND (target_author_tenant_slug = :gym OR context_tenant_slug = :gym) "
                        + "ORDER BY created_at DESC, id DESC LIMIT :limit",
                new MapSqlParameterSource("gym", tenantSlug).addValue("statuses", statuses).addValue("limit", limit), REPORT);
    }

    public List<ReportRow> escalatedReports(int limit) {
        return db.jdbc().query("SELECT * FROM community_reports WHERE status = 'ESCALATED' ORDER BY created_at, id LIMIT :limit",
                new MapSqlParameterSource("limit", limit), REPORT);
    }

    /** @return true if the report moved from OPEN/ESCALATED to the final status */
    public boolean close(long id, String finalStatus, long moderatorAuthorId, String scope) {
        return db.jdbc().update("UPDATE community_reports SET status = :status, resolved_by_author_id = :moderator, "
                        + "resolved_scope = :scope, resolved_at = NOW() WHERE id = :id AND status IN ('OPEN', 'ESCALATED')",
                new MapSqlParameterSource("id", id).addValue("status", finalStatus).addValue("moderator", moderatorAuthorId)
                        .addValue("scope", scope)) == 1;
    }

    /**
     * Platform escalation rules: an OPEN report unresolved for {@code maxAgeHours},
     * or any OPEN report whose target has reports from at least
     * {@code distinctReporters} different people. Returns the escalated ids.
     */
    public List<Long> escalate(int maxAgeHours, int distinctReporters) {
        return db.jdbc().queryForList("UPDATE community_reports r SET status = 'ESCALATED' WHERE r.status = 'OPEN' AND ("
                        + "r.created_at < NOW() - make_interval(hours => :hours) OR (SELECT count(DISTINCT x.reporter_author_id) "
                        + "FROM community_reports x WHERE x.target_type = r.target_type AND x.target_id = r.target_id) >= :reporters"
                        + ") RETURNING r.id",
                new MapSqlParameterSource("hours", maxAgeHours).addValue("reporters", distinctReporters), Long.class);
    }

    /** Escalates one report immediately (e.g. the reported author is staff of the gym that would moderate it). */
    public boolean escalateNow(long id) {
        return db.jdbc().update("UPDATE community_reports SET status = 'ESCALATED' WHERE id = :id AND status = 'OPEN'",
                new MapSqlParameterSource("id", id)) == 1;
    }
}
