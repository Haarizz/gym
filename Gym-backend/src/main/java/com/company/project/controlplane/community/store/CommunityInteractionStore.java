package com.company.project.controlplane.community.store;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.company.project.community.global.policy.CommunityModerationPolicy.HideScope;

/**
 * Comments, likes and comment hides. Like/unlike report whether a row was
 * actually inserted or removed so callers adjust counters only on a real change
 * — repeated or concurrent likes can't drift the count.
 */
@Component
public class CommunityInteractionStore {

    public record CommentRow(long id, long postId, long authorId, String authorTenantSlug, Long authorMemberId,
                             String content, String status, LocalDateTime createdAt, Set<HideScope> hides) {}

    private final CommunityDb db;

    public CommunityInteractionStore(CommunityDb db) {
        this.db = db;
    }

    // ── Likes ───────────────────────────────────────────────────────────────

    /** @return true if a new like was recorded (false if it already existed) */
    public boolean like(long postId, long authorId) {
        List<Long> inserted = db.jdbc().queryForList("INSERT INTO global_community_likes (post_id, author_id, origin) "
                        + "VALUES (:postId, :authorId, 'GLOBAL') ON CONFLICT (post_id, author_id) DO NOTHING RETURNING id",
                new MapSqlParameterSource("postId", postId).addValue("authorId", authorId), Long.class);
        return !inserted.isEmpty();
    }

    /** @return true if a like was removed (false if there was none) */
    public boolean unlike(long postId, long authorId) {
        return db.jdbc().update("DELETE FROM global_community_likes WHERE post_id = :postId AND author_id = :authorId",
                new MapSqlParameterSource("postId", postId).addValue("authorId", authorId)) == 1;
    }

    // ── Comments ────────────────────────────────────────────────────────────

    public long insertComment(long postId, long authorId, String authorTenantSlug, Long authorMemberId, String content) {
        return db.jdbc().queryForObject("INSERT INTO global_community_comments (post_id, author_id, author_tenant_slug, "
                        + "author_member_id, content, status, origin) VALUES (:postId, :authorId, :slug, :memberId, :content, "
                        + "'ACTIVE', 'GLOBAL') RETURNING id",
                new MapSqlParameterSource("postId", postId).addValue("authorId", authorId).addValue("slug", authorTenantSlug)
                        .addValue("memberId", authorMemberId).addValue("content", content),
                Long.class);
    }

    public Optional<CommentRow> findComment(long id) {
        List<CommentRow> rows = query("WHERE c.id = :id", new MapSqlParameterSource("id", id));
        return rows.stream().findFirst();
    }

    /** All non-deleted comments of a post, oldest first; callers filter hidden ones per viewer. */
    public List<CommentRow> commentsForPost(long postId) {
        return query("WHERE c.post_id = :postId AND c.status = 'ACTIVE' ORDER BY c.created_at, c.id",
                new MapSqlParameterSource("postId", postId));
    }

    /** Moderation queue: hidden comments written by, or appearing on posts from, one gym. */
    public List<CommentRow> hiddenCommentsForGym(String tenantSlug, int limit) {
        return query("JOIN global_community_posts p ON p.id = c.post_id WHERE c.status = 'ACTIVE' "
                        + "AND EXISTS (SELECT 1 FROM community_comment_hides h WHERE h.comment_id = c.id) "
                        + "AND (c.author_tenant_slug = :gym OR p.author_tenant_slug = :gym) "
                        + "ORDER BY c.created_at DESC, c.id DESC LIMIT :limit",
                new MapSqlParameterSource("gym", tenantSlug).addValue("limit", limit));
    }

    /** @return true if the comment went from ACTIVE to DELETED */
    public boolean deleteComment(long id) {
        return db.jdbc().update("UPDATE global_community_comments SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW() "
                + "WHERE id = :id AND status = 'ACTIVE'", new MapSqlParameterSource("id", id)) == 1;
    }

    // ── Hides (one row per scope) ───────────────────────────────────────────

    /** @return true if this scope's hide was added (false if the scope had already hidden it) */
    public boolean hideComment(long commentId, HideScope scope, String scopeTenantSlug, long moderatorAuthorId, String reason) {
        return db.jdbc().update("INSERT INTO community_comment_hides (comment_id, scope, scope_tenant_slug, hidden_by_author_id, reason) "
                        + "VALUES (:id, :scope, :slug, :moderator, :reason) ON CONFLICT (comment_id, scope) DO NOTHING",
                new MapSqlParameterSource("id", commentId).addValue("scope", scope.name()).addValue("slug", scopeTenantSlug)
                        .addValue("moderator", moderatorAuthorId).addValue("reason", reason)) == 1;
    }

    /** @return true if this scope's hide was lifted */
    public boolean restoreComment(long commentId, HideScope scope) {
        return db.jdbc().update("DELETE FROM community_comment_hides WHERE comment_id = :id AND scope = :scope",
                new MapSqlParameterSource("id", commentId).addValue("scope", scope.name())) == 1;
    }

    private List<CommentRow> query(String tail, MapSqlParameterSource params) {
        Map<Long, Set<HideScope>> hides = new HashMap<>();
        List<CommentRow> rows = db.jdbc().query("SELECT c.id, c.post_id, c.author_id, c.author_tenant_slug, c.author_member_id, "
                + "c.content, c.status, c.created_at FROM global_community_comments c " + tail, params, COMMENT_BASE);
        if (rows.isEmpty()) {
            return rows;
        }
        db.jdbc().query("SELECT comment_id, scope FROM community_comment_hides WHERE comment_id IN (:ids)",
                new MapSqlParameterSource("ids", rows.stream().map(CommentRow::id).toList()),
                rs -> {
                    hides.computeIfAbsent(rs.getLong(1), k -> EnumSet.noneOf(HideScope.class))
                            .add(HideScope.valueOf(rs.getString(2)));
                });
        return rows.stream()
                .map(c -> new CommentRow(c.id(), c.postId(), c.authorId(), c.authorTenantSlug(), c.authorMemberId(),
                        c.content(), c.status(), c.createdAt(), hides.getOrDefault(c.id(), EnumSet.noneOf(HideScope.class))))
                .toList();
    }

    private static final RowMapper<CommentRow> COMMENT_BASE = (rs, n) -> new CommentRow(
            rs.getLong("id"), rs.getLong("post_id"), rs.getLong("author_id"), rs.getString("author_tenant_slug"),
            (Long) rs.getObject("author_member_id"), rs.getString("content"), rs.getString("status"),
            rs.getTimestamp("created_at").toLocalDateTime(), EnumSet.noneOf(HideScope.class));
}
