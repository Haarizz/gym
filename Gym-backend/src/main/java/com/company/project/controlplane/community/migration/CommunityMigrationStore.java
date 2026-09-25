package com.company.project.controlplane.community.migration;

import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Identity;
import com.company.project.controlplane.community.store.CommunityDb;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Writes the read-only legacy replica into the global store, plus migration
 * runs and the quarantine. Every write is keyed by (legacy_source, legacy_id),
 * so a full run, a retry, a partial-failure recovery and a delta run all
 * converge on the same rows — nothing is duplicated.
 */
@Component
public class CommunityMigrationStore {

    public record QuarantineRow(long id, String legacySource, String legacyTable, long legacyId, String code,
                                String detail, String status, String resolution, String resolvedBy,
                                LocalDateTime resolvedAt, LocalDateTime firstSeenAt, LocalDateTime lastSeenAt) {}

    public record RunRow(long id, String kind, String mode, String status, String triggeredBy, String legacyDigest,
                         String summary, LocalDateTime startedAt, LocalDateTime finishedAt) {}

    public enum LikeOutcome { WRITTEN, IDENTITY_CONFLICT }

    private final CommunityDb db;

    public CommunityMigrationStore(CommunityDb db) {
        this.db = db;
    }

    public CommunityDb db() {
        return db;
    }

    // ── Runs ────────────────────────────────────────────────────────────────

    public long startRun(String kind, String mode, String triggeredBy) {
        return db.jdbc().queryForObject("INSERT INTO community_migration_runs (kind, mode, status, triggered_by) "
                        + "VALUES (:kind, :mode, 'RUNNING', :by) RETURNING id",
                new MapSqlParameterSource("kind", kind).addValue("mode", mode).addValue("by", triggeredBy), Long.class);
    }

    public void finishRun(long id, String status, String legacyDigest, String summary) {
        db.jdbc().update("UPDATE community_migration_runs SET status = :status, legacy_digest = :digest, summary = :summary, "
                        + "finished_at = NOW() WHERE id = :id",
                new MapSqlParameterSource("id", id).addValue("status", status).addValue("digest", legacyDigest)
                        .addValue("summary", summary));
    }

    /** A run left RUNNING by a crashed process would block every future run; expire it. */
    public int expireStaleRuns(int hours) {
        return db.jdbc().update("UPDATE community_migration_runs SET status = 'ERROR', finished_at = NOW(), "
                + "summary = coalesce(summary, '') || ' [expired: still RUNNING after ' || :hours || 'h]' "
                + "WHERE status = 'RUNNING' AND started_at < NOW() - make_interval(hours => :hours)",
                new MapSqlParameterSource("hours", hours));
    }

    public boolean anyRunning() {
        Integer n = db.jdbc().queryForObject("SELECT count(*) FROM community_migration_runs WHERE status = 'RUNNING'",
                new MapSqlParameterSource(), Integer.class);
        return n != null && n > 0;
    }

    public List<RunRow> recentRuns(int limit) {
        return db.jdbc().query("SELECT * FROM community_migration_runs ORDER BY id DESC LIMIT :limit",
                new MapSqlParameterSource("limit", limit),
                (rs, n) -> new RunRow(rs.getLong("id"), rs.getString("kind"), rs.getString("mode"), rs.getString("status"),
                        rs.getString("triggered_by"), rs.getString("legacy_digest"), rs.getString("summary"),
                        rs.getTimestamp("started_at").toLocalDateTime(),
                        rs.getTimestamp("finished_at") == null ? null : rs.getTimestamp("finished_at").toLocalDateTime()));
    }

    // ── Quarantine ──────────────────────────────────────────────────────────

    /** Records a quarantined record. A previously RESOLVED row that is anomalous again is reopened. */
    public void quarantine(String source, String table, long legacyId, String code, String detail, long runId) {
        db.jdbc().update("INSERT INTO community_migration_quarantine (legacy_source, legacy_table, legacy_id, code, detail, last_run_id) "
                        + "VALUES (:source, :table, :id, :code, :detail, :run) "
                        + "ON CONFLICT (legacy_source, legacy_table, legacy_id, code) DO UPDATE SET detail = EXCLUDED.detail, "
                        + "last_seen_at = NOW(), last_run_id = EXCLUDED.last_run_id, "
                        + "status = CASE WHEN community_migration_quarantine.status = 'RESOLVED' THEN 'OPEN' "
                        + "ELSE community_migration_quarantine.status END",
                new MapSqlParameterSource("source", source).addValue("table", table).addValue("id", legacyId)
                        .addValue("code", code).addValue("detail", detail).addValue("run", runId));
    }

    /** Records a policy-driven exclusion as an accountable APPROVED_EXCLUSION. */
    public void exclude(String source, String table, long legacyId, String reason, long runId) {
        db.jdbc().update("INSERT INTO community_migration_quarantine (legacy_source, legacy_table, legacy_id, code, detail, "
                        + "status, resolution, resolved_by, resolved_at, last_run_id) VALUES (:source, :table, :id, 'EXCLUDED', "
                        + ":reason, 'APPROVED_EXCLUSION', :reason, 'policy', NOW(), :run) "
                        + "ON CONFLICT (legacy_source, legacy_table, legacy_id, code) DO UPDATE SET last_seen_at = NOW(), "
                        + "last_run_id = EXCLUDED.last_run_id",
                new MapSqlParameterSource("source", source).addValue("table", table).addValue("id", legacyId)
                        .addValue("reason", reason).addValue("run", runId));
    }

    /**
     * Rows for these sources that this run didn't raise again are resolved
     * automatically: OPEN anomalies that disappeared, and policy exclusions whose
     * policy no longer excludes the record. Operator decisions are never touched.
     */
    public int resolveNoLongerAnomalous(Collection<String> sources, long runId) {
        if (sources.isEmpty()) {
            return 0;
        }
        return db.jdbc().update("UPDATE community_migration_quarantine SET status = 'RESOLVED', "
                        + "resolution = 'No longer raised at migration run ' || :run, resolved_by = 'system', resolved_at = NOW() "
                        + "WHERE legacy_source IN (:sources) AND last_run_id IS DISTINCT FROM :run "
                        + "AND (status = 'OPEN' OR (status = 'APPROVED_EXCLUSION' AND resolved_by = 'policy'))",
                new MapSqlParameterSource("run", runId).addValue("sources", sources));
    }

    /** "source|table|id" keys an operator marked APPROVED_EXCLUSION. */
    public Set<String> approvedExclusions() {
        return new HashSet<>(db.jdbc().queryForList("SELECT legacy_source || '|' || legacy_table || '|' || legacy_id "
                + "FROM community_migration_quarantine WHERE status = 'APPROVED_EXCLUSION' AND resolved_by <> 'policy'",
                new MapSqlParameterSource(), String.class));
    }

    /** "source|table|id" keys with at least one OPEN quarantine row. */
    public Set<String> openQuarantineKeys() {
        return new HashSet<>(db.jdbc().queryForList("SELECT DISTINCT legacy_source || '|' || legacy_table || '|' || legacy_id "
                + "FROM community_migration_quarantine WHERE status = 'OPEN'", new MapSqlParameterSource(), String.class));
    }

    public List<QuarantineRow> listQuarantine(String status, int limit) {
        MapSqlParameterSource p = new MapSqlParameterSource("limit", limit);
        String where = "";
        if (status != null) {
            where = "WHERE status = :status ";
            p.addValue("status", status);
        }
        return db.jdbc().query("SELECT * FROM community_migration_quarantine " + where + "ORDER BY id LIMIT :limit", p,
                (rs, n) -> new QuarantineRow(rs.getLong("id"), rs.getString("legacy_source"), rs.getString("legacy_table"),
                        rs.getLong("legacy_id"), rs.getString("code"), rs.getString("detail"), rs.getString("status"),
                        rs.getString("resolution"), rs.getString("resolved_by"),
                        rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toLocalDateTime(),
                        rs.getTimestamp("first_seen_at").toLocalDateTime(), rs.getTimestamp("last_seen_at").toLocalDateTime()));
    }

    /**
     * An operator decision on one quarantine row. APPROVED_EXCLUSION keeps the
     * record out of the migration permanently; RESOLVED means the source was
     * fixed (the next run re-evaluates it and reopens the row if it's still anomalous).
     */
    public boolean decide(long id, String status, String resolvedBy, String resolution) {
        return db.jdbc().update("UPDATE community_migration_quarantine SET status = :status, resolution = :resolution, "
                        + "resolved_by = :by, resolved_at = NOW() WHERE id = :id AND status = 'OPEN'",
                new MapSqlParameterSource("id", id).addValue("status", status).addValue("by", resolvedBy)
                        .addValue("resolution", resolution)) == 1;
    }

    public int openQuarantineCount() {
        Integer n = db.jdbc().queryForObject("SELECT count(*) FROM community_migration_quarantine WHERE status = 'OPEN'",
                new MapSqlParameterSource(), Integer.class);
        return n == null ? 0 : n;
    }

    // ── Replica writes ──────────────────────────────────────────────────────

    /** Existing author rows win: a live profile refreshed by the author isn't overwritten by migration. */
    public long ensureAuthor(Identity identity, String displayName, String avatarUrl) {
        MapSqlParameterSource p = new MapSqlParameterSource("kind", identity.kind())
                .addValue("g", identity.globalUserId()).addValue("slug", identity.tenantSlug())
                .addValue("t", identity.tenantUserId()).addValue("pl", identity.platformUserId())
                .addValue("name", displayName == null || displayName.isBlank() ? "GymBios member" : truncate(displayName))
                .addValue("avatar", avatarUrl);
        String conflict = switch (identity.kind()) {
            case "GLOBAL" -> "(global_user_id) WHERE kind = 'GLOBAL'";
            case "TENANT" -> "(tenant_slug, tenant_user_id) WHERE kind = 'TENANT'";
            default -> "(platform_user_id) WHERE kind = 'PLATFORM'";
        };
        db.jdbc().update("INSERT INTO community_authors (kind, global_user_id, tenant_slug, tenant_user_id, platform_user_id, "
                + "display_name, avatar_url) VALUES (:kind, :g, :slug, :t, :pl, :name, :avatar) ON CONFLICT " + conflict
                + " DO NOTHING", p);
        String where = switch (identity.kind()) {
            case "GLOBAL" -> "kind = 'GLOBAL' AND global_user_id = :g";
            case "TENANT" -> "kind = 'TENANT' AND tenant_slug = :slug AND tenant_user_id = :t";
            default -> "kind = 'PLATFORM' AND platform_user_id = :pl";
        };
        return db.jdbc().queryForObject("SELECT id FROM community_authors WHERE " + where, p, Long.class);
    }

    public record LegacyPost(long authorId, String gym, Long branchId, Long memberId, String gymName, String branchName,
                             String topic, String content, String type, boolean archived, LocalDateTime archivedAt,
                             String source, long legacyId, String fingerprint, LocalDateTime createdAt) {}

    public long upsertPost(LegacyPost p) {
        return db.jdbc().queryForObject("INSERT INTO global_community_posts (author_id, author_tenant_slug, author_branch_id, "
                        + "author_member_id, author_gym_name, author_branch_name, topic, content, type, visibility, status, origin, "
                        + "archived_at, legacy_source, legacy_id, legacy_fingerprint, created_at) VALUES (:author, :gym, :branch, "
                        + ":member, :gymName, :branchName, :topic, :content, :type, 'GYM', :status, 'LEGACY', :archivedAt, :source, "
                        + ":legacyId, :fp, :createdAt) "
                        + "ON CONFLICT (legacy_source, legacy_id) DO UPDATE SET author_id = EXCLUDED.author_id, "
                        + "author_tenant_slug = EXCLUDED.author_tenant_slug, author_branch_id = EXCLUDED.author_branch_id, "
                        + "author_member_id = EXCLUDED.author_member_id, author_gym_name = EXCLUDED.author_gym_name, "
                        + "author_branch_name = EXCLUDED.author_branch_name, topic = EXCLUDED.topic, content = EXCLUDED.content, "
                        + "type = EXCLUDED.type, status = EXCLUDED.status, archived_at = EXCLUDED.archived_at, deleted_at = NULL, "
                        + "legacy_fingerprint = EXCLUDED.legacy_fingerprint, created_at = EXCLUDED.created_at, updated_at = NOW() "
                        + "RETURNING id",
                new MapSqlParameterSource("author", p.authorId()).addValue("gym", p.gym()).addValue("branch", p.branchId())
                        .addValue("member", p.memberId()).addValue("gymName", p.gymName()).addValue("branchName", p.branchName())
                        .addValue("topic", p.topic()).addValue("content", p.content()).addValue("type", p.type())
                        .addValue("status", p.archived() ? "ARCHIVED" : "ACTIVE")
                        .addValue("archivedAt", ts(p.archivedAt())).addValue("source", p.source()).addValue("legacyId", p.legacyId())
                        .addValue("fp", p.fingerprint()).addValue("createdAt", ts(p.createdAt())),
                Long.class);
    }

    public void upsertImage(long postId, String contentType, byte[] data, Integer width, Integer height, String aspect,
                            Integer crop, Integer zoom, String sha256) {
        db.jdbc().update("INSERT INTO global_community_post_images (post_id, origin, content_type, data, byte_size, width, height, "
                        + "aspect_ratio, crop_position, crop_zoom, sha256) VALUES (:post, 'LEGACY', :type, :data, :size, :w, :h, :ar, "
                        + ":crop, :zoom, :sha) ON CONFLICT (post_id) DO UPDATE SET content_type = EXCLUDED.content_type, "
                        + "data = EXCLUDED.data, byte_size = EXCLUDED.byte_size, width = EXCLUDED.width, height = EXCLUDED.height, "
                        + "aspect_ratio = EXCLUDED.aspect_ratio, crop_position = EXCLUDED.crop_position, "
                        + "crop_zoom = EXCLUDED.crop_zoom, sha256 = EXCLUDED.sha256",
                new MapSqlParameterSource("post", postId).addValue("type", contentType).addValue("data", data)
                        .addValue("size", data.length).addValue("w", width).addValue("h", height).addValue("ar", aspect)
                        .addValue("crop", crop).addValue("zoom", zoom).addValue("sha", sha256));
    }

    public long upsertComment(long postId, long authorId, String gym, Long memberId, String content, String source,
                              long legacyId, String fingerprint, LocalDateTime createdAt) {
        return db.jdbc().queryForObject("INSERT INTO global_community_comments (post_id, author_id, author_tenant_slug, "
                        + "author_member_id, content, status, origin, legacy_source, legacy_id, legacy_fingerprint, created_at) "
                        + "VALUES (:post, :author, :gym, :member, :content, 'ACTIVE', 'LEGACY', :source, :legacyId, :fp, :createdAt) "
                        + "ON CONFLICT (legacy_source, legacy_id) DO UPDATE SET post_id = EXCLUDED.post_id, "
                        + "author_id = EXCLUDED.author_id, author_tenant_slug = EXCLUDED.author_tenant_slug, "
                        + "author_member_id = EXCLUDED.author_member_id, content = EXCLUDED.content, status = 'ACTIVE', "
                        + "deleted_at = NULL, legacy_fingerprint = EXCLUDED.legacy_fingerprint, created_at = EXCLUDED.created_at, "
                        + "updated_at = NOW() RETURNING id",
                new MapSqlParameterSource("post", postId).addValue("author", authorId).addValue("gym", gym)
                        .addValue("member", memberId).addValue("content", content).addValue("source", source)
                        .addValue("legacyId", legacyId).addValue("fp", fingerprint).addValue("createdAt", ts(createdAt)),
                Long.class);
    }

    /**
     * Two different legacy likes can't map to the same (post, author) — if they
     * would, that's an identity problem to review, not something to merge.
     */
    public LikeOutcome upsertLike(long postId, long authorId, String source, long legacyId, String fingerprint,
                                  LocalDateTime createdAt) {
        List<Map<String, Object>> clash = db.jdbc().queryForList("SELECT legacy_source, legacy_id FROM global_community_likes "
                        + "WHERE post_id = :post AND author_id = :author AND NOT (legacy_source IS NOT DISTINCT FROM :source "
                        + "AND legacy_id IS NOT DISTINCT FROM :legacyId)",
                new MapSqlParameterSource("post", postId).addValue("author", authorId).addValue("source", source)
                        .addValue("legacyId", legacyId));
        if (!clash.isEmpty()) {
            return LikeOutcome.IDENTITY_CONFLICT;
        }
        db.jdbc().update("INSERT INTO global_community_likes (post_id, author_id, origin, legacy_source, legacy_id, "
                        + "legacy_fingerprint, created_at) VALUES (:post, :author, 'LEGACY', :source, :legacyId, :fp, :createdAt) "
                        + "ON CONFLICT (legacy_source, legacy_id) DO UPDATE SET post_id = EXCLUDED.post_id, "
                        + "author_id = EXCLUDED.author_id, legacy_fingerprint = EXCLUDED.legacy_fingerprint, "
                        + "created_at = EXCLUDED.created_at",
                new MapSqlParameterSource("post", postId).addValue("author", authorId).addValue("source", source)
                        .addValue("legacyId", legacyId).addValue("fp", fingerprint).addValue("createdAt", ts(createdAt)));
        return LikeOutcome.WRITTEN;
    }

    /** Replica rows of this source that shouldn't exist any more (deleted or no longer migratable). */
    public int tombstonePosts(String source, Collection<Long> keepLegacyIds) {
        return db.jdbc().update("UPDATE global_community_posts SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW() "
                        + "WHERE origin = 'LEGACY' AND legacy_source = :source AND status <> 'DELETED' AND legacy_id <> ALL (:keep)",
                new MapSqlParameterSource("source", source).addValue("keep", keepLegacyIds.toArray(new Long[0])));
    }

    public int tombstoneComments(String source, Collection<Long> keepLegacyIds) {
        return db.jdbc().update("UPDATE global_community_comments SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW() "
                        + "WHERE origin = 'LEGACY' AND legacy_source = :source AND status <> 'DELETED' AND legacy_id <> ALL (:keep)",
                new MapSqlParameterSource("source", source).addValue("keep", keepLegacyIds.toArray(new Long[0])));
    }

    public int removeLikes(String source, Collection<Long> keepLegacyIds) {
        return db.jdbc().update("DELETE FROM global_community_likes WHERE origin = 'LEGACY' AND legacy_source = :source "
                        + "AND legacy_id <> ALL (:keep)",
                new MapSqlParameterSource("source", source).addValue("keep", keepLegacyIds.toArray(new Long[0])));
    }

    /** Counters for this source's replica posts, from the replica rows. */
    public int recomputeCounters(String source) {
        return db.jdbc().update("UPDATE global_community_posts p SET "
                + "like_count = (SELECT count(*) FROM global_community_likes l WHERE l.post_id = p.id), "
                + "comment_count = (SELECT count(*) FROM global_community_comments c WHERE c.post_id = p.id AND c.status <> 'DELETED') "
                + "WHERE p.origin = 'LEGACY' AND p.legacy_source = :source", new MapSqlParameterSource("source", source));
    }

    public Optional<Long> globalIdOf(String table, String source, long legacyId) {
        return db.jdbc().queryForList("SELECT id FROM " + table + " WHERE legacy_source = :source AND legacy_id = :id",
                new MapSqlParameterSource("source", source).addValue("id", legacyId), Long.class).stream().findFirst();
    }

    private static Timestamp ts(LocalDateTime t) {
        return t == null ? null : Timestamp.valueOf(t);
    }

    private static String truncate(String s) {
        return s.length() <= 120 ? s : s.substring(0, 120);
    }
}
