package com.company.project.controlplane.community.migration;

import com.company.project.community.global.CommunityException;
import com.company.project.controlplane.community.baseline.CommunityBaselineService;
import com.company.project.controlplane.community.baseline.CommunityBaselineService.Analysis;
import com.company.project.controlplane.community.baseline.CommunityBaselineService.Source;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.CommentRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.LikeRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.PostRow;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Action;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Decision;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Identity;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Plan;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Policies;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.SourcePlan;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * Proves the global replica equals the legacy data, record by record, from a
 * fresh analysis (never from what the backfill remembers). PASS only if:
 *  - every migratable legacy post/comment/like has exactly one global row;
 *  - no global legacy row exists that shouldn't (orphans) and no legacy key is duplicated;
 *  - author identity, gym, branch, timestamps, archived→status, visibility
 *    (GYM, C2), text hashes, image presence and the stored fingerprint match;
 *  - like/comment counters match both the legacy rows and the global rows;
 *  - each gym's legacy feed order equals its global feed order (first page);
 *  - every source was readable and no quarantine record is still OPEN.
 * The run is stored in community_migration_runs; a FINAL PASS during the write
 * freeze is what the cutover requires.
 */
@Service
public class CommunityReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(CommunityReconciliationService.class);
    private static final int MAX_DIFFS_REPORTED = 200;
    private static final int FEED_PAGE = 20;

    public record Result(long runId, String status, String mode, String baselineDigest, Map<String, Long> checked,
                         int differences, List<String> firstDifferences, int openQuarantine) {}

    private final CommunityBaselineService baseline;
    private final CommunityMigrationStore store;
    private final CommunityRolloutStore rolloutStore;
    private final ObjectMapper objectMapper;

    public CommunityReconciliationService(CommunityBaselineService baseline, CommunityMigrationStore store,
                                          CommunityRolloutStore rolloutStore, ObjectMapper objectMapper) {
        this.baseline = baseline;
        this.store = store;
        this.rolloutStore = rolloutStore;
        this.objectMapper = objectMapper;
    }

    public synchronized Result run(String mode, String triggeredBy) {
        if (!"DELTA".equals(mode) && !"FINAL".equals(mode)) {
            throw CommunityException.invalid("INVALID_MODE", "Reconciliation mode must be DELTA or FINAL");
        }
        var state = rolloutStore.load();
        if (state.isGlobalAuthority()) {
            throw CommunityException.conflict("ALREADY_GLOBAL", "Reconciliation against legacy ended at cutover");
        }
        if ("FINAL".equals(mode) && !"READ_ONLY".equals(state.writeMode())) {
            throw CommunityException.conflict("WRITES_NOT_FROZEN", "A FINAL reconciliation needs write_mode = READ_ONLY");
        }
        store.expireStaleRuns(2);
        if (store.anyRunning()) {
            throw CommunityException.conflict("RUN_IN_PROGRESS", "Another migration run is in progress");
        }
        long runId = store.startRun("RECONCILE", mode, triggeredBy);
        try {
            Analysis analysis = baseline.analyze();
            Policies policies = new Policies(state.platformAuthorPolicy(), state.unregisteredGymPolicy(),
                    state.primaryMemberLoginPolicy(), state.nullBranchPolicy());
            Plan plan = LegacyMigrationPlanner.plan(analysis, policies, store.approvedExclusions());
            Set<String> open = store.openQuarantineKeys();

            Diffs diffs = new Diffs();
            Map<String, Long> checked = new LinkedHashMap<>();
            for (Source s : analysis.sources()) {
                if (!s.isUsable() && s.snapshot() == null) {
                    diffs.add("SOURCE_NOT_READABLE " + s.name());
                }
            }
            for (SourcePlan sp : plan.sources()) {
                reconcileSource(sp, open, diffs, checked);
            }
            int openCount = store.openQuarantineCount();
            if (openCount > 0) {
                diffs.add("OPEN_QUARANTINE " + openCount + " record(s) still need a decision");
            }
            String status = diffs.count == 0 ? "PASS" : "FAIL";
            Result result = new Result(runId, status, mode, plan.baselineDigest(), checked, diffs.count, diffs.first, openCount);
            store.finishRun(runId, status, plan.baselineDigest(), objectMapper.writeValueAsString(result));
            log.info("community migration RECONCILE run={} mode={} status={} differences={}", runId, mode, status, diffs.count);
            return result;
        } catch (Exception e) {
            store.finishRun(runId, "ERROR", null, e.getClass().getSimpleName() + ": " + e.getMessage());
            log.error("community migration RECONCILE run={} failed", runId, e);
            throw e instanceof RuntimeException re ? re : new IllegalStateException(e);
        }
    }

    private static final class Diffs {
        int count;
        final List<String> first = new ArrayList<>();

        void add(String d) {
            count++;
            if (first.size() < MAX_DIFFS_REPORTED) {
                first.add(d);
            }
        }
    }

    private record GlobalRow(long id, long legacyId, String fingerprint, String status, String visibility, String gym,
                             Long branchId, String createdAt, String topicMd5, String contentMd5, Identity author,
                             int likeCount, int commentCount, boolean hasImage, Long postLegacyId, int actualLikes,
                             int actualComments) {}

    private void reconcileSource(SourcePlan sp, Set<String> open, Diffs diffs, Map<String, Long> checked) {
        Source source = sp.source();
        String src = source.name();
        var snap = source.snapshot();

        Map<Long, Decision> expectedPosts = expected(sp.posts(), src, LegacyMigrationPlanner.POSTS, open);
        Map<Long, Decision> expectedComments = expected(sp.comments(), src, LegacyMigrationPlanner.COMMENTS, open);
        Map<Long, Decision> expectedLikes = expected(sp.likes(), src, LegacyMigrationPlanner.LIKES, open);
        checked.merge("posts", (long) expectedPosts.size(), Long::sum);
        checked.merge("comments", (long) expectedComments.size(), Long::sum);
        checked.merge("likes", (long) expectedLikes.size(), Long::sum);

        // Posts
        Map<Long, GlobalRow> posts = loadPosts(src);
        Map<Long, Long> expectedLikeCount = new HashMap<>();
        Map<Long, Long> expectedCommentCount = new HashMap<>();
        expectedLikes.values().forEach(d -> expectedLikeCount.merge(snap.likes.get(d.legacyId()).postId(), 1L, Long::sum));
        expectedComments.values().forEach(d -> expectedCommentCount.merge(snap.comments.get(d.legacyId()).postId(), 1L, Long::sum));

        for (Decision d : expectedPosts.values()) {
            PostRow p = snap.posts.get(d.legacyId());
            GlobalRow g = posts.get(d.legacyId());
            String where = src + " post " + d.legacyId();
            if (g == null || "DELETED".equals(g.status())) {
                diffs.add("MISSING " + where);
                continue;
            }
            check(diffs, where, "fingerprint", LegacyFingerprints.post(d, p), g.fingerprint());
            check(diffs, where, "status", Boolean.TRUE.equals(p.archived()) ? "ARCHIVED" : "ACTIVE", g.status());
            check(diffs, where, "visibility", "GYM", g.visibility());
            check(diffs, where, "author", d.author(), g.author());
            check(diffs, where, "gym", d.gym(), g.gym());
            check(diffs, where, "branch", d.branchId(), g.branchId());
            check(diffs, where, "created_at", p.createdAt(), g.createdAt());
            check(diffs, where, "topic", p.topicMd5(), g.topicMd5());
            check(diffs, where, "content", p.contentMd5(), g.contentMd5());
            check(diffs, where, "image", p.imageRef() != null && p.imagePresent(), g.hasImage());
            long likes = expectedLikeCount.getOrDefault(d.legacyId(), 0L);
            long comments = expectedCommentCount.getOrDefault(d.legacyId(), 0L);
            check(diffs, where, "like_count", likes, (long) g.likeCount());
            check(diffs, where, "comment_count", comments, (long) g.commentCount());
            check(diffs, where, "like_rows", (long) g.likeCount(), (long) g.actualLikes());
            check(diffs, where, "comment_rows", (long) g.commentCount(), (long) g.actualComments());
        }
        orphans(diffs, src, "post", posts, expectedPosts);

        // Comments
        Map<Long, GlobalRow> comments = loadComments(src);
        for (Decision d : expectedComments.values()) {
            CommentRow c = snap.comments.get(d.legacyId());
            GlobalRow g = comments.get(d.legacyId());
            String where = src + " comment " + d.legacyId();
            if (g == null || "DELETED".equals(g.status())) {
                diffs.add("MISSING " + where);
                continue;
            }
            check(diffs, where, "fingerprint", LegacyFingerprints.comment(d, c), g.fingerprint());
            check(diffs, where, "author", d.author(), g.author());
            check(diffs, where, "gym", d.gym(), g.gym());
            check(diffs, where, "post", c.postId(), g.postLegacyId());
            check(diffs, where, "created_at", c.createdAt(), g.createdAt());
            check(diffs, where, "content", c.contentMd5(), g.contentMd5());
        }
        orphans(diffs, src, "comment", comments, expectedComments);

        // Likes
        Map<Long, GlobalRow> likes = loadLikes(src);
        for (Decision d : expectedLikes.values()) {
            LikeRow l = snap.likes.get(d.legacyId());
            GlobalRow g = likes.get(d.legacyId());
            String where = src + " like " + d.legacyId();
            if (g == null) {
                diffs.add("MISSING " + where);
                continue;
            }
            check(diffs, where, "fingerprint", LegacyFingerprints.like(d, l), g.fingerprint());
            check(diffs, where, "author", d.author(), g.author());
            check(diffs, where, "post", l.postId(), g.postLegacyId());
            check(diffs, where, "created_at", l.createdAt(), g.createdAt());
        }
        orphans(diffs, src, "like", likes, expectedLikes);

        // Duplicate legacy keys (the unique constraints should make this impossible).
        for (String table : List.of("global_community_posts", "global_community_comments", "global_community_likes")) {
            Integer dupes = store.db().jdbc().queryForObject("SELECT count(*) FROM (SELECT legacy_id FROM " + table
                    + " WHERE legacy_source = :s GROUP BY legacy_id HAVING count(*) > 1) x", new MapSqlParameterSource("s", src), Integer.class);
            if (dupes != null && dupes > 0) {
                diffs.add("DUPLICATE_LEGACY_KEYS " + src + " " + table + " " + dupes);
            }
        }

        // Feed order per gym: the legacy gym feed (non-archived, newest first) vs the global gym feed.
        Map<String, List<Decision>> byGym = new HashMap<>();
        expectedPosts.values().stream()
                .filter(d -> !Boolean.TRUE.equals(snap.posts.get(d.legacyId()).archived()))
                .forEach(d -> byGym.computeIfAbsent(d.gym(), k -> new ArrayList<>()).add(d));
        for (var e : byGym.entrySet()) {
            List<Long> legacyOrder = e.getValue().stream()
                    .sorted(Comparator.comparing((Decision d) -> snap.posts.get(d.legacyId()).createdAt()).reversed()
                            .thenComparing(Decision::legacyId, Comparator.reverseOrder()))
                    .limit(FEED_PAGE).map(Decision::legacyId).toList();
            List<Long> globalOrder = store.db().jdbc().queryForList("SELECT legacy_id FROM global_community_posts "
                            + "WHERE legacy_source = :s AND author_tenant_slug = :gym AND status = 'ACTIVE' AND origin = 'LEGACY' "
                            + "ORDER BY created_at DESC, id DESC LIMIT :n",
                    new MapSqlParameterSource("s", src).addValue("gym", e.getKey()).addValue("n", FEED_PAGE), Long.class);
            if (!legacyOrder.equals(globalOrder)) {
                diffs.add("FEED_ORDER " + src + " gym " + e.getKey() + " legacy=" + legacyOrder + " global=" + globalOrder);
            }
        }
    }

    /** Migratable records not held back by an OPEN quarantine discovered during a backfill. */
    private static Map<Long, Decision> expected(Map<Long, Decision> decisions, String src, String table, Set<String> open) {
        Map<Long, Decision> out = new LinkedHashMap<>();
        decisions.values().forEach(d -> {
            if (d.action() == Action.MIGRATE && !open.contains(src + "|" + table + "|" + d.legacyId())) {
                out.put(d.legacyId(), d);
            }
        });
        return out;
    }

    private static void orphans(Diffs diffs, String src, String what, Map<Long, GlobalRow> global, Map<Long, Decision> expected) {
        Set<Long> unexpected = new TreeSet<>();
        global.forEach((legacyId, row) -> {
            if (!expected.containsKey(legacyId) && !"DELETED".equals(row.status())) {
                unexpected.add(legacyId);
            }
        });
        unexpected.forEach(id -> diffs.add("ORPHAN " + src + " " + what + " " + id));
    }

    private static void check(Diffs diffs, String where, String field, Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) {
            diffs.add("MISMATCH " + where + " " + field + " expected=" + expected + " actual=" + actual);
        }
    }

    private Map<Long, GlobalRow> loadPosts(String src) {
        Map<Long, GlobalRow> out = new HashMap<>();
        store.db().jdbc().query("SELECT p.id, p.legacy_id, p.legacy_fingerprint, p.status, p.visibility, p.author_tenant_slug, "
                        + "p.author_branch_id, p.created_at::text AS created, md5(p.topic) AS t, md5(p.content) AS c, p.like_count, "
                        + "p.comment_count, (i.post_id IS NOT NULL) AS has_image, "
                        + "(SELECT count(*) FROM global_community_likes l WHERE l.post_id = p.id) AS actual_likes, "
                        + "(SELECT count(*) FROM global_community_comments x WHERE x.post_id = p.id AND x.status <> 'DELETED') AS actual_comments, "
                        + "a.kind, a.global_user_id, a.tenant_slug, a.tenant_user_id, a.platform_user_id "
                        + "FROM global_community_posts p JOIN community_authors a ON a.id = p.author_id "
                        + "LEFT JOIN global_community_post_images i ON i.post_id = p.id "
                        + "WHERE p.origin = 'LEGACY' AND p.legacy_source = :s",
                new MapSqlParameterSource("s", src),
                rs -> {
                    out.put(rs.getLong("legacy_id"), new GlobalRow(rs.getLong("id"), rs.getLong("legacy_id"),
                            rs.getString("legacy_fingerprint"), rs.getString("status"), rs.getString("visibility"),
                            rs.getString("author_tenant_slug"), (Long) rs.getObject("author_branch_id"), rs.getString("created"),
                            rs.getString("t"), rs.getString("c"), identity(rs), rs.getInt("like_count"), rs.getInt("comment_count"),
                            rs.getBoolean("has_image"), null, rs.getInt("actual_likes"), rs.getInt("actual_comments")));
                });
        return out;
    }

    private Map<Long, GlobalRow> loadComments(String src) {
        Map<Long, GlobalRow> out = new HashMap<>();
        store.db().jdbc().query("SELECT c.id, c.legacy_id, c.legacy_fingerprint, c.status, c.author_tenant_slug, "
                        + "c.created_at::text AS created, md5(c.content) AS m, p.legacy_id AS post_legacy_id, "
                        + "a.kind, a.global_user_id, a.tenant_slug, a.tenant_user_id, a.platform_user_id "
                        + "FROM global_community_comments c JOIN community_authors a ON a.id = c.author_id "
                        + "JOIN global_community_posts p ON p.id = c.post_id "
                        + "WHERE c.origin = 'LEGACY' AND c.legacy_source = :s",
                new MapSqlParameterSource("s", src),
                rs -> {
                    out.put(rs.getLong("legacy_id"), new GlobalRow(rs.getLong("id"), rs.getLong("legacy_id"),
                            rs.getString("legacy_fingerprint"), rs.getString("status"), null, rs.getString("author_tenant_slug"),
                            null, rs.getString("created"), null, rs.getString("m"), identity(rs), 0, 0, false,
                            (Long) rs.getObject("post_legacy_id"), 0, 0));
                });
        return out;
    }

    private Map<Long, GlobalRow> loadLikes(String src) {
        Map<Long, GlobalRow> out = new HashMap<>();
        store.db().jdbc().query("SELECT l.id, l.legacy_id, l.legacy_fingerprint, l.created_at::text AS created, "
                        + "p.legacy_id AS post_legacy_id, a.kind, a.global_user_id, a.tenant_slug, a.tenant_user_id, a.platform_user_id "
                        + "FROM global_community_likes l JOIN community_authors a ON a.id = l.author_id "
                        + "JOIN global_community_posts p ON p.id = l.post_id "
                        + "WHERE l.origin = 'LEGACY' AND l.legacy_source = :s",
                new MapSqlParameterSource("s", src),
                rs -> {
                    out.put(rs.getLong("legacy_id"), new GlobalRow(rs.getLong("id"), rs.getLong("legacy_id"),
                            rs.getString("legacy_fingerprint"), "ACTIVE", null, null, null, rs.getString("created"), null, null,
                            identity(rs), 0, 0, false, (Long) rs.getObject("post_legacy_id"), 0, 0));
                });
        return out;
    }

    private static Identity identity(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Identity(rs.getString("kind"), (Long) rs.getObject("global_user_id"), rs.getString("tenant_slug"),
                (Long) rs.getObject("tenant_user_id"), (Long) rs.getObject("platform_user_id"));
    }
}
