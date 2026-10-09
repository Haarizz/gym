package com.company.project.controlplane.community.migration;

import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.Snapshot;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads full legacy content (text, image data URLs, display names, member ids)
 * for records the planner decided to migrate. Batched, READ ONLY, always rolled
 * back. Each row is re-checked against the analysed snapshot: if it changed
 * after the analysis ran it is reported as changed and skipped this run (the
 * next run picks it up), so nothing is migrated in a state the analysis
 * didn't see.
 */
@Component
public class LegacyContentReader {

    private static final int BATCH = 200;

    public record PostContent(long id, String topic, String content, String type, String imageDataUrl,
                              String imageAspectRatio, Integer imageCropPosition, Integer imageCropZoom,
                              java.time.LocalDateTime createdAt, java.time.LocalDateTime updatedAt) {}

    public record CommentContent(long id, String content, java.time.LocalDateTime createdAt) {}

    public record Content(Map<Long, PostContent> posts, Map<Long, CommentContent> comments,
                          Map<Long, java.time.LocalDateTime> likeCreatedAt, List<Long> changedPosts, List<Long> changedComments,
                          Map<Long, String> displayNames, Map<Long, String> avatarUrls,
                          Map<Long, Long> memberIdByUserId, Map<Long, Long> memberIdByGlobalUserId,
                          Map<Long, String> branchNames) {}

    public Content read(DataSource ds, Snapshot snapshot, Collection<Long> postIds, Collection<Long> commentIds,
                        Collection<Long> likeIds, Collection<Long> userIds) throws SQLException {
        try (Connection c = ds.getConnection()) {
            boolean autoCommit = c.getAutoCommit();
            boolean readOnly = c.isReadOnly();
            c.setAutoCommit(false);
            c.setReadOnly(true);
            try {
                try (Statement st = c.createStatement()) {
                    st.execute("SET TRANSACTION READ ONLY");
                }
                return readAll(c, snapshot, postIds, commentIds, likeIds, userIds);
            } finally {
                c.rollback();
                c.setReadOnly(readOnly);
                c.setAutoCommit(autoCommit);
            }
        }
    }

    private Content readAll(Connection c, Snapshot snap, Collection<Long> postIds, Collection<Long> commentIds,
                            Collection<Long> likeIds, Collection<Long> userIds) throws SQLException {
        boolean largeObject = "oid".equals(snap.imageColumnType);
        String image = largeObject
                ? "CASE WHEN EXISTS (SELECT 1 FROM pg_largeobject_metadata m WHERE m.oid = p.image_data_url) "
                  + "THEN convert_from(lo_get(p.image_data_url), 'UTF8') END"
                : "p.image_data_url::text";
        String imageMd5 = largeObject
                ? "CASE WHEN EXISTS (SELECT 1 FROM pg_largeobject_metadata m WHERE m.oid = p.image_data_url) "
                  + "THEN md5(lo_get(p.image_data_url)) END"
                : "md5(p.image_data_url)";

        Map<Long, PostContent> posts = new HashMap<>();
        List<Long> changedPosts = new ArrayList<>();
        for (List<Long> batch : batches(postIds)) {
            try (PreparedStatement ps = c.prepareStatement("SELECT p.id, p.topic, p.content, p.type, " + image + ", "
                    + "p.image_aspect_ratio, p.image_crop_position, p.image_crop_zoom, p.created_at, p.updated_at, "
                    + "md5(coalesce(p.topic, '')), md5(coalesce(p.content, '')), "
                    + "md5(concat_ws('|', coalesce(p.type, ''), coalesce(p.image_aspect_ratio, ''), "
                    + "coalesce(p.image_crop_position::text, ''), coalesce(p.image_crop_zoom::text, ''))), "
                    + imageMd5 + ", p.archived, p.author_user_id, p.branch_id, p.created_at::text "
                    + "FROM community_posts p WHERE p.id = ANY (?)")) {
                ps.setArray(1, array(c, batch));
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        long id = rs.getLong(1);
                        var expected = snap.posts.get(id);
                        boolean same = expected != null
                                && eq(expected.topicMd5(), rs.getString(11))
                                && eq(expected.contentMd5(), rs.getString(12))
                                && eq(expected.metaMd5(), rs.getString(13))
                                && (expected.imageMd5() == null || eq(expected.imageMd5(), rs.getString(14)))
                                && eq(expected.archived(), rs.getObject(15))
                                && eq(expected.authorUserId(), rs.getObject(16))
                                && eq(expected.branchId(), rs.getObject(17))
                                && eq(expected.createdAt(), rs.getString(18));
                        if (!same) {
                            changedPosts.add(id);
                            continue;
                        }
                        posts.put(id, new PostContent(id, rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                                rs.getString(6), (Integer) rs.getObject(7), (Integer) rs.getObject(8),
                                rs.getTimestamp(9).toLocalDateTime(),
                                rs.getTimestamp(10) == null ? null : rs.getTimestamp(10).toLocalDateTime()));
                    }
                }
            }
        }
        for (Long id : postIds) {
            if (!posts.containsKey(id) && !changedPosts.contains(id)) {
                changedPosts.add(id);   // deleted since the analysis
            }
        }

        Map<Long, CommentContent> comments = new HashMap<>();
        List<Long> changedComments = new ArrayList<>();
        for (List<Long> batch : batches(commentIds)) {
            try (PreparedStatement ps = c.prepareStatement("SELECT id, content, created_at, md5(coalesce(content, '')), "
                    + "author_user_id, post_id FROM community_post_comments WHERE id = ANY (?)")) {
                ps.setArray(1, array(c, batch));
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        long id = rs.getLong(1);
                        var expected = snap.comments.get(id);
                        if (expected == null || !eq(expected.contentMd5(), rs.getString(4))
                                || !eq(expected.authorUserId(), rs.getObject(5)) || !eq(expected.postId(), rs.getObject(6))) {
                            changedComments.add(id);
                            continue;
                        }
                        comments.put(id, new CommentContent(id, rs.getString(2), rs.getTimestamp(3).toLocalDateTime()));
                    }
                }
            }
        }
        for (Long id : commentIds) {
            if (!comments.containsKey(id) && !changedComments.contains(id)) {
                changedComments.add(id);
            }
        }

        Map<Long, java.time.LocalDateTime> likeCreatedAt = new HashMap<>();
        for (List<Long> batch : batches(likeIds)) {
            try (PreparedStatement ps = c.prepareStatement("SELECT id, created_at FROM community_post_likes WHERE id = ANY (?)")) {
                ps.setArray(1, array(c, batch));
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        likeCreatedAt.put(rs.getLong(1), rs.getTimestamp(2).toLocalDateTime());
                    }
                }
            }
        }

        Map<Long, String> names = new HashMap<>();
        Map<Long, String> avatars = new HashMap<>();
        Map<Long, Long> memberByUser = new HashMap<>();
        Map<Long, Long> memberByGlobal = new HashMap<>();
        for (List<Long> batch : batches(userIds)) {
            Array ids = array(c, batch);
            try (PreparedStatement ps = c.prepareStatement("SELECT user_id, full_name, photo_url FROM user_profiles WHERE user_id = ANY (?)")) {
                ps.setArray(1, ids);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        if (rs.getString(2) != null && !rs.getString(2).isBlank()) names.put(rs.getLong(1), rs.getString(2).trim());
                        if (rs.getString(3) != null && !rs.getString(3).isBlank()) avatars.put(rs.getLong(1), rs.getString(3));
                    }
                }
            }
            memberIds(c, "user_id", ids, memberByUser);
            if (snap.membersHaveGlobalUserId) {
                memberIds(c, "global_user_id", ids, memberByGlobal);
            }
            try (PreparedStatement ps = c.prepareStatement("SELECT user_id, name FROM members WHERE user_id = ANY (?) AND name IS NOT NULL")) {
                ps.setArray(1, ids);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        names.putIfAbsent(rs.getLong(1), rs.getString(2).trim());
                    }
                }
            }
        }
        Map<Long, String> branchNames = new HashMap<>();
        if (!snap.branchGym.isEmpty()) {
            try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT id, branch_name FROM branches")) {
                while (rs.next()) {
                    branchNames.put(rs.getLong(1), rs.getString(2));
                }
            }
        }
        return new Content(posts, comments, likeCreatedAt, changedPosts, changedComments, names, avatars, memberByUser,
                memberByGlobal, branchNames);
    }

    /** Member id only when exactly one member row links to the user — otherwise none (never guessed). */
    private static void memberIds(Connection c, String column, Array ids, Map<Long, Long> into) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT " + column + ", min(id), count(*) FROM members WHERE "
                + column + " = ANY (?) GROUP BY 1")) {
            ps.setArray(1, ids);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    if (rs.getInt(3) == 1) {
                        into.put(rs.getLong(1), rs.getLong(2));
                    }
                }
            }
        }
    }

    private static List<List<Long>> batches(Collection<Long> ids) {
        List<List<Long>> out = new ArrayList<>();
        List<Long> current = new ArrayList<>();
        for (Long id : ids) {
            current.add(id);
            if (current.size() == BATCH) {
                out.add(current);
                current = new ArrayList<>();
            }
        }
        if (!current.isEmpty()) {
            out.add(current);
        }
        return out;
    }

    private static Array array(Connection c, List<Long> ids) throws SQLException {
        return c.createArrayOf("bigint", ids.toArray());
    }

    private static boolean eq(Object a, Object b) {
        return a == null ? b == null : a.equals(b);
    }
}
