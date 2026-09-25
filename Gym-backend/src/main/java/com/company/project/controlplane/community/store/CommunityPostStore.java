package com.company.project.controlplane.community.store;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * global_community_posts and their images. Feeds use keyset pagination on
 * (created_at, id) backed by the V6 indexes; nothing loads a table into memory.
 * Status changes are conditional on the expected current status, so a
 * concurrent change can't be silently overwritten.
 */
@Component
public class CommunityPostStore {

    public record PostRow(long id, long authorId, String authorTenantSlug, Long authorBranchId, Long authorMemberId,
                          String authorGymName, String authorBranchName, String topic, String content, String type,
                          String visibility, String status, String origin, int likeCount, int commentCount,
                          LocalDateTime createdAt, boolean hasImage, Integer imageWidth, Integer imageHeight,
                          String imageAspectRatio, Integer imageCropPosition, Integer imageCropZoom) {}

    public record NewPost(long authorId, String authorTenantSlug, Long authorBranchId, Long authorMemberId,
                          String authorGymName, String authorBranchName, String topic, String content, String type) {}

    public record NewImage(String contentType, byte[] data, int width, int height, String aspectRatio,
                           Integer cropPosition, Integer cropZoom, String sha256) {}

    public record Image(String contentType, byte[] data, String sha256) {}

    /** Keyset position: the last (created_at, id) of the previous page. */
    public record Cursor(LocalDateTime createdAt, long id) {}

    /** Optional feed filters. */
    public record Filter(String type, String query) {
        public static final Filter NONE = new Filter(null, null);
    }

    private static final String SELECT = "SELECT p.id, p.author_id, p.author_tenant_slug, p.author_branch_id, "
            + "p.author_member_id, p.author_gym_name, p.author_branch_name, p.topic, p.content, p.type, p.visibility, "
            + "p.status, p.origin, p.like_count, p.comment_count, p.created_at, (i.post_id IS NOT NULL) AS has_image, "
            + "i.width, i.height, i.aspect_ratio, i.crop_position, i.crop_zoom "
            + "FROM global_community_posts p LEFT JOIN global_community_post_images i ON i.post_id = p.id ";

    private static final RowMapper<PostRow> MAPPER = (rs, n) -> new PostRow(
            rs.getLong("id"), rs.getLong("author_id"), rs.getString("author_tenant_slug"),
            (Long) rs.getObject("author_branch_id"), (Long) rs.getObject("author_member_id"),
            rs.getString("author_gym_name"), rs.getString("author_branch_name"), rs.getString("topic"),
            rs.getString("content"), rs.getString("type"), rs.getString("visibility"), rs.getString("status"),
            rs.getString("origin"), rs.getInt("like_count"), rs.getInt("comment_count"),
            rs.getTimestamp("created_at").toLocalDateTime(), rs.getBoolean("has_image"),
            (Integer) rs.getObject("width"), (Integer) rs.getObject("height"), rs.getString("aspect_ratio"),
            (Integer) rs.getObject("crop_position"), (Integer) rs.getObject("crop_zoom"));

    private final CommunityDb db;

    public CommunityPostStore(CommunityDb db) {
        this.db = db;
    }

    public long insert(NewPost post) {
        return db.jdbc().queryForObject("INSERT INTO global_community_posts (author_id, author_tenant_slug, "
                        + "author_branch_id, author_member_id, author_gym_name, author_branch_name, topic, content, type, "
                        + "visibility, status, origin) VALUES (:authorId, :authorTenantSlug, :authorBranchId, :authorMemberId, "
                        + ":authorGymName, :authorBranchName, :topic, :content, :type, 'PUBLIC', 'ACTIVE', 'GLOBAL') RETURNING id",
                new MapSqlParameterSource()
                        .addValue("authorId", post.authorId())
                        .addValue("authorTenantSlug", post.authorTenantSlug())
                        .addValue("authorBranchId", post.authorBranchId())
                        .addValue("authorMemberId", post.authorMemberId())
                        .addValue("authorGymName", post.authorGymName())
                        .addValue("authorBranchName", post.authorBranchName())
                        .addValue("topic", post.topic())
                        .addValue("content", post.content())
                        .addValue("type", post.type()),
                Long.class);
    }

    public void insertImage(long postId, NewImage image) {
        db.jdbc().update("INSERT INTO global_community_post_images (post_id, origin, content_type, data, byte_size, width, "
                        + "height, aspect_ratio, crop_position, crop_zoom, sha256) VALUES (:postId, 'GLOBAL', :contentType, "
                        + ":data, :byteSize, :width, :height, :aspectRatio, :cropPosition, :cropZoom, :sha256)",
                new MapSqlParameterSource()
                        .addValue("postId", postId)
                        .addValue("contentType", image.contentType())
                        .addValue("data", image.data())
                        .addValue("byteSize", image.data().length)
                        .addValue("width", image.width())
                        .addValue("height", image.height())
                        .addValue("aspectRatio", image.aspectRatio())
                        .addValue("cropPosition", image.cropPosition())
                        .addValue("cropZoom", image.cropZoom())
                        .addValue("sha256", image.sha256()));
    }

    public Optional<PostRow> findById(long id) {
        List<PostRow> rows = db.jdbc().query(SELECT + "WHERE p.id = :id", new MapSqlParameterSource("id", id), MAPPER);
        return rows.stream().findFirst();
    }

    public Optional<Image> findImage(long postId) {
        List<Image> rows = db.jdbc().query("SELECT content_type, data, sha256 FROM global_community_post_images WHERE post_id = :id",
                new MapSqlParameterSource("id", postId),
                (rs, n) -> new Image(rs.getString(1), rs.getBytes(2), rs.getString(3).trim()));
        return rows.stream().findFirst();
    }

    /** Public, active posts from every gym. */
    public List<PostRow> publicFeed(Filter filter, Cursor after, int limit) {
        return page("p.status = 'ACTIVE' AND p.visibility = 'PUBLIC'", new MapSqlParameterSource(), filter, after, limit);
    }

    /** Active posts written from one gym, including gym-only (legacy) posts. Caller must have verified the viewer's gym. */
    public List<PostRow> gymFeed(String tenantSlug, Filter filter, Cursor after, int limit) {
        return page("p.status = 'ACTIVE' AND p.author_tenant_slug = :gym",
                new MapSqlParameterSource("gym", tenantSlug), filter, after, limit);
    }

    public List<PostRow> byAuthor(long authorId, Collection<String> statuses, Cursor after, int limit) {
        return page("p.author_id = :authorId AND p.status IN (:statuses)",
                new MapSqlParameterSource("authorId", authorId).addValue("statuses", statuses), Filter.NONE, after, limit);
    }

    /** Moderation queue: one gym's posts in the given states. */
    public List<PostRow> gymPostsInStatus(String tenantSlug, Collection<String> statuses, Cursor after, int limit) {
        return page("p.author_tenant_slug = :gym AND p.status IN (:statuses)",
                new MapSqlParameterSource("gym", tenantSlug).addValue("statuses", statuses), Filter.NONE, after, limit);
    }

    private List<PostRow> page(String where, MapSqlParameterSource params, Filter filter, Cursor after, int limit) {
        StringBuilder sql = new StringBuilder(SELECT).append("WHERE ").append(where);
        if (filter.type() != null) {
            sql.append(" AND p.type = :type");
            params.addValue("type", filter.type());
        }
        if (filter.query() != null) {
            sql.append(" AND (p.topic ILIKE :q ESCAPE '\\' OR p.content ILIKE :q ESCAPE '\\')");
            params.addValue("q", "%" + escapeLike(filter.query()) + "%");
        }
        if (after != null) {
            sql.append(" AND (p.created_at, p.id) < (:afterTs, :afterId)");
            params.addValue("afterTs", Timestamp.valueOf(after.createdAt())).addValue("afterId", after.id());
        }
        sql.append(" ORDER BY p.created_at DESC, p.id DESC LIMIT :limit");
        params.addValue("limit", limit);
        return db.jdbc().query(sql.toString(), params, MAPPER);
    }

    // ── State transitions (conditional) ─────────────────────────────────────

    public boolean archive(long id) {
        return transition(id, "ACTIVE", "status = 'ARCHIVED', archived_at = NOW()");
    }

    public boolean unarchive(long id) {
        return transition(id, "ARCHIVED", "status = 'ACTIVE', archived_at = NULL");
    }

    public boolean delete(long id, String fromStatus) {
        return transition(id, fromStatus, "status = 'DELETED', deleted_at = NOW()");
    }

    public boolean hide(long id, String fromStatus, long moderatorAuthorId, String reason) {
        return db.jdbc().update("UPDATE global_community_posts SET status = 'HIDDEN', hidden_at = NOW(), "
                        + "hidden_by_author_id = :moderator, hidden_reason = :reason, updated_at = NOW() "
                        + "WHERE id = :id AND status = :from",
                new MapSqlParameterSource("id", id).addValue("from", fromStatus)
                        .addValue("moderator", moderatorAuthorId).addValue("reason", reason)) == 1;
    }

    /** Lifts a moderator hide, returning the post to whatever the author had left it as (ACTIVE or ARCHIVED). */
    public boolean restore(long id) {
        return transition(id, "HIDDEN", "status = CASE WHEN archived_at IS NOT NULL THEN 'ARCHIVED' ELSE 'ACTIVE' END, "
                + "hidden_at = NULL, hidden_by_author_id = NULL, hidden_reason = NULL");
    }

    private boolean transition(long id, String from, String set) {
        return db.jdbc().update("UPDATE global_community_posts SET " + set + ", updated_at = NOW() WHERE id = :id AND status = :from",
                new MapSqlParameterSource("id", id).addValue("from", from)) == 1;
    }

    // ── Counters (atomic; never read-modify-write in Java) ──────────────────

    public void adjustLikeCount(long postId, int delta) {
        db.jdbc().update("UPDATE global_community_posts SET like_count = like_count + :delta WHERE id = :id",
                new MapSqlParameterSource("id", postId).addValue("delta", delta));
    }

    public void adjustCommentCount(long postId, int delta) {
        db.jdbc().update("UPDATE global_community_posts SET comment_count = comment_count + :delta WHERE id = :id",
                new MapSqlParameterSource("id", postId).addValue("delta", delta));
    }

    /**
     * Recomputes both counters from their source rows. like_count counts likes;
     * comment_count counts comments that aren't deleted (hidden ones included).
     * Returns how many posts were corrected.
     */
    public int repairCounters() {
        return db.jdbc().update("UPDATE global_community_posts p SET like_count = x.likes, comment_count = x.comments "
                + "FROM (SELECT q.id, "
                + "  (SELECT count(*) FROM global_community_likes l WHERE l.post_id = q.id) AS likes, "
                + "  (SELECT count(*) FROM global_community_comments c WHERE c.post_id = q.id AND c.status <> 'DELETED') AS comments "
                + "  FROM global_community_posts q) x "
                + "WHERE p.id = x.id AND (p.like_count <> x.likes OR p.comment_count <> x.comments)",
                new MapSqlParameterSource());
    }

    // ── Aggregates ──────────────────────────────────────────────────────────

    public record TopicCount(String topic, long posts) {}

    public List<TopicCount> trendingTopics(int days, int limit) {
        return db.jdbc().query("SELECT btrim(topic) AS topic, count(*) AS n FROM global_community_posts "
                        + "WHERE status = 'ACTIVE' AND visibility = 'PUBLIC' AND created_at >= NOW() - make_interval(days => :days) "
                        + "AND btrim(topic) <> '' GROUP BY btrim(topic) ORDER BY n DESC, topic LIMIT :limit",
                new MapSqlParameterSource("days", days).addValue("limit", limit),
                (rs, n) -> new TopicCount(rs.getString("topic"), rs.getLong("n")));
    }

    public record AuthorEngagement(long authorId, long posts, long likes, long comments) {}

    public List<AuthorEngagement> leaderboard(int limit) {
        return db.jdbc().query("SELECT author_id, count(*) AS posts, sum(like_count) AS likes, sum(comment_count) AS comments "
                        + "FROM global_community_posts WHERE status = 'ACTIVE' AND visibility = 'PUBLIC' GROUP BY author_id "
                        + "ORDER BY sum(like_count) + sum(comment_count) DESC, count(*) DESC, author_id LIMIT :limit",
                new MapSqlParameterSource("limit", limit),
                (rs, n) -> new AuthorEngagement(rs.getLong("author_id"), rs.getLong("posts"), rs.getLong("likes"), rs.getLong("comments")));
    }

    public Set<Long> likedBy(long authorId, Collection<Long> postIds) {
        if (postIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(db.jdbc().queryForList("SELECT post_id FROM global_community_likes "
                        + "WHERE author_id = :authorId AND post_id IN (:ids)",
                new MapSqlParameterSource("authorId", authorId).addValue("ids", postIds), Long.class));
    }

    static String escapeLike(String value) {
        StringBuilder out = new StringBuilder();
        for (char c : value.toCharArray()) {
            if (c == '%' || c == '_' || c == '\\') {
                out.append('\\');
            }
            out.append(c);
        }
        return out.toString();
    }

    public static List<Long> ids(List<PostRow> posts) {
        List<Long> ids = new ArrayList<>(posts.size());
        posts.forEach(p -> ids.add(p.id()));
        return ids;
    }
}
