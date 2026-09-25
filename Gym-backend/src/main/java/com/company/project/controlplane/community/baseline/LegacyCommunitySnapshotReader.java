package com.company.project.controlplane.community.baseline;

import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Reads one legacy Community store (primary DB or a tenant DB) into an
 * in-memory {@link Snapshot} using plain JDBC on an explicitly supplied
 * DataSource — never through TenantContextHolder/TenantRoutingDataSource.
 *
 * Every read happens inside a single REPEATABLE READ, READ ONLY transaction
 * that is always rolled back, so all counts and checksums for a source come
 * from one consistent snapshot and nothing can be written.
 */
@Component
public class LegacyCommunitySnapshotReader {

    private static final List<String> REQUIRED_POST_COLUMNS = List.of(
            "id", "author_user_id", "branch_id", "archived", "like_count", "comment_count", "created_at",
            "topic", "content", "type", "image_data_url", "image_aspect_ratio", "image_crop_position", "image_crop_zoom");
    private static final List<String> REQUIRED_COMMENT_COLUMNS = List.of("id", "post_id", "author_user_id", "created_at", "content");
    private static final List<String> REQUIRED_LIKE_COLUMNS = List.of("id", "post_id", "user_id", "created_at");

    public record GymRow(long id, String slug, String status) {}

    public record PostRow(long id, Long authorUserId, Long branchId, Boolean archived, int likeCount, int commentCount,
                          String createdAt, String topicMd5, String contentMd5, String metaMd5,
                          String imageRef, boolean imagePresent, String imageMd5) {

        /** Fields that never change after creation — used to match a stale primary copy to its tenant row. */
        public String immutableFingerprint() {
            return String.join("|", s(authorUserId), s(branchId), createdAt, topicMd5, contentMd5, metaMd5);
        }
    }

    public record CommentRow(long id, Long postId, Long authorUserId, String createdAt, String contentMd5) {
        public String immutableFingerprint() {
            return String.join("|", s(postId), s(authorUserId), createdAt, contentMd5);
        }
    }

    public record LikeRow(long id, Long postId, Long userId, String createdAt) {
        public String immutableFingerprint() {
            return String.join("|", s(postId), s(userId), createdAt);
        }
    }

    public record UserRow(long id, String username, String email, Set<String> roles) {}

    public static class Snapshot {
        public String database;
        public boolean hasCommunityTables;
        public String imageColumnType;
        public boolean imageDigestAvailable;
        public boolean branchesHaveGymId;
        public boolean membersHaveGlobalUserId;
        public String communityModuleStatus;
        public final TreeMap<Long, GymRow> gyms = new TreeMap<>();
        /** branch id -> gym id (null when branches has no gym_id column). */
        public final Map<Long, Long> branchGym = new HashMap<>();
        public final TreeMap<Long, PostRow> posts = new TreeMap<>();
        public final TreeMap<Long, CommentRow> comments = new TreeMap<>();
        public final TreeMap<Long, LikeRow> likes = new TreeMap<>();
        public final Map<Long, UserRow> users = new HashMap<>();
        public final Map<Long, Integer> membersByUserId = new HashMap<>();
        public final Map<Long, Integer> membersByGlobalUserId = new HashMap<>();
    }

    public Snapshot read(DataSource dataSource) throws SQLException {
        try (Connection c = dataSource.getConnection()) {
            boolean previousAutoCommit = c.getAutoCommit();
            boolean previousReadOnly = c.isReadOnly();
            int previousIsolation = c.getTransactionIsolation();
            c.setAutoCommit(false);
            c.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            c.setReadOnly(true);
            try {
                try (Statement st = c.createStatement()) {
                    st.execute("SET TRANSACTION READ ONLY");
                }
                return readInTransaction(c);
            } finally {
                c.rollback();
                c.setReadOnly(previousReadOnly);
                c.setTransactionIsolation(previousIsolation);
                c.setAutoCommit(previousAutoCommit);
            }
        }
    }

    private Snapshot readInTransaction(Connection c) throws SQLException {
        Snapshot snap = new Snapshot();
        snap.database = c.getCatalog();

        snap.hasCommunityTables = tableExists(c, "community_posts")
                && tableExists(c, "community_post_comments")
                && tableExists(c, "community_post_likes");

        if (tableExists(c, "gyms")) {
            try (Statement st = c.createStatement();
                 ResultSet rs = st.executeQuery("SELECT id, slug, status FROM gyms ORDER BY id")) {
                while (rs.next()) {
                    snap.gyms.put(rs.getLong(1), new GymRow(rs.getLong(1), rs.getString(2), rs.getString(3)));
                }
            }
        }

        if (tableExists(c, "branches")) {
            snap.branchesHaveGymId = columns(c, "branches").contains("gym_id");
            String sql = snap.branchesHaveGymId ? "SELECT id, gym_id FROM branches" : "SELECT id, NULL::bigint FROM branches";
            try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    snap.branchGym.put(rs.getLong(1), (Long) rs.getObject(2));
                }
            }
        }

        if (tableExists(c, "platform_modules")) {
            try (Statement st = c.createStatement();
                 ResultSet rs = st.executeQuery("SELECT status FROM platform_modules WHERE module_key = 'COMMUNITY'")) {
                snap.communityModuleStatus = rs.next() ? rs.getString(1) : "NOT_CONFIGURED";
            }
        } else {
            snap.communityModuleStatus = "NO_PLATFORM_MODULES_TABLE";
        }

        if (!snap.hasCommunityTables) {
            return snap;
        }

        requireColumns(c, "community_posts", REQUIRED_POST_COLUMNS);
        requireColumns(c, "community_post_comments", REQUIRED_COMMENT_COLUMNS);
        requireColumns(c, "community_post_likes", REQUIRED_LIKE_COLUMNS);

        snap.imageColumnType = columnType(c, "community_posts", "image_data_url");
        boolean largeObject = "oid".equals(snap.imageColumnType);
        snap.imageDigestAvailable = !largeObject || probeLargeObjectRead(c);

        readPosts(c, snap, largeObject);
        readComments(c, snap);
        readLikes(c, snap);
        readReferencedUsers(c, snap);
        return snap;
    }

    private void readPosts(Connection c, Snapshot snap, boolean largeObject) throws SQLException {
        String imageSelect;
        String imageJoin = "";
        if (largeObject) {
            imageSelect = "p.image_data_url::text, (lo.oid IS NOT NULL), "
                    + (snap.imageDigestAvailable
                    ? "CASE WHEN lo.oid IS NOT NULL THEN md5(lo_get(p.image_data_url)) END"
                    : "NULL::text");
            imageJoin = " LEFT JOIN pg_largeobject_metadata lo ON lo.oid = p.image_data_url";
        } else {
            imageSelect = "CASE WHEN p.image_data_url IS NULL THEN NULL ELSE 'inline' END, "
                    + "(p.image_data_url IS NOT NULL), md5(p.image_data_url)";
        }
        String sql = "SELECT p.id, p.author_user_id, p.branch_id, p.archived, p.like_count, p.comment_count, "
                + "p.created_at::text, md5(coalesce(p.topic, '')), md5(coalesce(p.content, '')), "
                + "md5(concat_ws('|', coalesce(p.type, ''), coalesce(p.image_aspect_ratio, ''), "
                + "coalesce(p.image_crop_position::text, ''), coalesce(p.image_crop_zoom::text, ''))), "
                + imageSelect
                + " FROM community_posts p" + imageJoin + " ORDER BY p.id";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                long id = rs.getLong(1);
                snap.posts.put(id, new PostRow(
                        id,
                        (Long) rs.getObject(2),
                        (Long) rs.getObject(3),
                        (Boolean) rs.getObject(4),
                        rs.getInt(5),
                        rs.getInt(6),
                        rs.getString(7),
                        rs.getString(8),
                        rs.getString(9),
                        rs.getString(10),
                        rs.getString(11),
                        rs.getBoolean(12),
                        rs.getString(13)));
            }
        }
    }

    private void readComments(Connection c, Snapshot snap) throws SQLException {
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT id, post_id, author_user_id, created_at::text, "
                     + "md5(coalesce(content, '')) FROM community_post_comments ORDER BY id")) {
            while (rs.next()) {
                long id = rs.getLong(1);
                snap.comments.put(id, new CommentRow(id, (Long) rs.getObject(2), (Long) rs.getObject(3),
                        rs.getString(4), rs.getString(5)));
            }
        }
    }

    private void readLikes(Connection c, Snapshot snap) throws SQLException {
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT id, post_id, user_id, created_at::text "
                     + "FROM community_post_likes ORDER BY id")) {
            while (rs.next()) {
                long id = rs.getLong(1);
                snap.likes.put(id, new LikeRow(id, (Long) rs.getObject(2), (Long) rs.getObject(3), rs.getString(4)));
            }
        }
    }

    private void readReferencedUsers(Connection c, Snapshot snap) throws SQLException {
        Set<Long> ids = new TreeSet<>();
        snap.posts.values().forEach(p -> addIfPresent(ids, p.authorUserId()));
        snap.comments.values().forEach(cm -> addIfPresent(ids, cm.authorUserId()));
        snap.likes.values().forEach(l -> addIfPresent(ids, l.userId()));
        if (ids.isEmpty()) {
            return;
        }
        Array idArray = c.createArrayOf("bigint", ids.toArray());

        Map<Long, Set<String>> roles = new HashMap<>();
        if (tableExists(c, "user_roles") && tableExists(c, "roles")) {
            try (PreparedStatement ps = c.prepareStatement("SELECT ur.user_id, r.role_name FROM user_roles ur "
                    + "JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ANY (?)")) {
                ps.setArray(1, idArray);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        roles.computeIfAbsent(rs.getLong(1), k -> new TreeSet<>()).add(rs.getString(2));
                    }
                }
            }
        }

        try (PreparedStatement ps = c.prepareStatement("SELECT id, username, email FROM users WHERE id = ANY (?)")) {
            ps.setArray(1, idArray);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long id = rs.getLong(1);
                    snap.users.put(id, new UserRow(id, rs.getString(2), rs.getString(3),
                            roles.getOrDefault(id, new TreeSet<>())));
                }
            }
        }

        if (tableExists(c, "members")) {
            countMembers(c, "user_id", idArray, snap.membersByUserId);
            snap.membersHaveGlobalUserId = columns(c, "members").contains("global_user_id");
            if (snap.membersHaveGlobalUserId) {
                countMembers(c, "global_user_id", idArray, snap.membersByGlobalUserId);
            }
        }
    }

    private void countMembers(Connection c, String column, Array ids, Map<Long, Integer> into) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT " + column + ", count(*) FROM members WHERE " + column + " = ANY (?) GROUP BY 1")) {
            ps.setArray(1, ids);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    into.put(rs.getLong(1), rs.getInt(2));
                }
            }
        }
    }

    /**
     * lo_get needs SELECT privilege on each large object. Probe once inside a
     * savepoint so a permission failure degrades to "no image digest" instead
     * of aborting the whole snapshot transaction.
     */
    private boolean probeLargeObjectRead(Connection c) throws SQLException {
        Savepoint sp = c.setSavepoint();
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT md5(lo_get(p.image_data_url)) FROM community_posts p "
                     + "JOIN pg_largeobject_metadata lo ON lo.oid = p.image_data_url LIMIT 1")) {
            rs.next();
            c.releaseSavepoint(sp);
            return true;
        } catch (SQLException e) {
            c.rollback(sp);
            return false;
        }
    }

    private static boolean tableExists(Connection c, String table) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT to_regclass(?) IS NOT NULL")) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }

    private static Set<String> columns(Connection c, String table) throws SQLException {
        Set<String> cols = new HashSet<>();
        try (PreparedStatement ps = c.prepareStatement("SELECT column_name FROM information_schema.columns "
                + "WHERE table_schema = current_schema() AND table_name = ?")) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    cols.add(rs.getString(1));
                }
            }
        }
        return cols;
    }

    private static String columnType(Connection c, String table, String column) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT data_type FROM information_schema.columns "
                + "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?")) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString(1) : null;
            }
        }
    }

    private static void requireColumns(Connection c, String table, List<String> required) throws SQLException {
        Set<String> present = columns(c, table);
        List<String> missing = new ArrayList<>();
        for (String col : required) {
            if (!present.contains(col)) {
                missing.add(col);
            }
        }
        if (!missing.isEmpty()) {
            throw new SchemaDriftException(table + " is missing columns " + missing);
        }
    }

    private static void addIfPresent(Set<Long> ids, Long id) {
        if (id != null) {
            ids.add(id);
        }
    }

    private static String s(Object o) {
        return o == null ? "" : o.toString();
    }

    /** The source's legacy Community schema doesn't match what the backfill expects. */
    public static class SchemaDriftException extends SQLException {
        public SchemaDriftException(String message) {
            super(message);
        }
    }
}
