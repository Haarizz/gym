package com.company.project.community;

import com.company.project.community.global.CommunityException;
import com.company.project.community.support.CommunityHarness;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import com.company.project.dto.mobile.community.GlobalCommunityDtos.CreateComment;
import com.company.project.dto.mobile.community.GlobalCommunityDtos.CreatePost;
import com.company.project.dto.mobile.community.GlobalCommunityDtos.CreateReport;
import com.company.project.dto.mobile.community.GlobalCommunityDtos.Moderate;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.function.Executable;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static com.company.project.community.support.CommunityHarness.MOBILE;
import static com.company.project.community.support.CommunityHarness.mobile;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Mandatory pre-cutover security gate (§19): scenarios A–L through the real
 * services, stores and policy against a control plane plus two isolated gym
 * databases, with identities carried by real signed JWTs.
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
class GlobalCommunitySecurityIT {

    private static CommunityHarness h;

    @BeforeAll
    static void start() throws Exception {
        h = new CommunityHarness();
        h.enableEverything();
    }

    @AfterAll
    static void stop() throws Exception {
        h.close();
    }

    @AfterEach
    void signOut() {
        h.signOut();
    }

    private static String code(Executable action) {
        return assertThrows(CommunityException.class, action).getCode();
    }

    private static CreatePost post(String gym) {
        return new CreatePost("Transformation", "Six months of work", "achievement", gym, null);
    }

    private GlobalCommunityDtos.Post johnPostsFromGymA() {
        h.asJohn();
        return h.community.createPost(mobile("gym-a"), post("gym-a"));
    }

    // ── A / B: post moderation is scoped to the author's gym ────────────────

    @Test
    void scenarioA_gymAModeratorModeratesGymAMembersPost() {
        long id = johnPostsFromGymA().id();
        h.asGymAAdmin();
        assertEquals("HIDDEN", h.moderation.hidePost(MOBILE, id, new Moderate("spam", null)).status());
        assertEquals("ACTIVE", h.moderation.restorePost(MOBILE, id, new Moderate("ok after review", null)).status());
        assertEquals(2, h.controlJdbc.queryForObject("SELECT count(*) FROM community_moderation_actions "
                + "WHERE target_type = 'POST' AND target_id = ? AND actor_tenant_slug = 'gym-a'", Integer.class, id));
    }

    @Test
    void scenarioB_gymBModeratorCannotModerateGymAMembersPost() {
        long id = johnPostsFromGymA().id();
        h.asGymBAdmin();
        assertTrue(h.community.post(MOBILE, id).author().gymSlug().equals("gym-a"), "B can still see A's post");
        assertFalse(h.community.post(MOBILE, id).viewer().canHide());
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hidePost(MOBILE, id, null)));
        h.asJohn();
        assertEquals("ACTIVE", h.community.post(MOBILE, id).status());
    }

    // ── C / D: cross-gym comments and the two hide scopes ───────────────────

    @Test
    void scenarioC_gymBMemberCommentsOnGymAMembersPost() {
        long id = johnPostsFromGymA().id();
        h.asJessica();
        GlobalCommunityDtos.Comment c = h.community.addComment(mobile("gym-b"), id, new CreateComment("Great work!", null));
        assertEquals("gym-b", c.author().gymSlug());
        assertTrue(c.author().isMine());
        h.asJohn();
        assertEquals(1, h.community.post(MOBILE, id).commentCount());
        assertFalse(h.community.comments(MOBILE, id).get(0).author().isMine());
    }

    @Test
    void scenarioD_gymAHidesJessicasCommentOnlyInPostOwnerScope() {
        long postId = johnPostsFromGymA().id();
        h.asJessica();
        long commentId = h.community.addComment(mobile("gym-b"), postId, new CreateComment("abusive", null)).id();

        h.asGymAAdmin();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hideComment(MOBILE, commentId, new Moderate("x", "AUTHOR_GYM"))));
        GlobalCommunityDtos.Comment hidden = h.moderation.hideComment(MOBILE, commentId, new Moderate("abuse", null));
        assertEquals(Set.of("POST_OWNER_GYM"), hidden.hiddenScopes());

        // Gym B can add its own, independent hide but can't lift Gym A's.
        h.asGymBAdmin();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.restoreComment(MOBILE, commentId, new Moderate("x", "POST_OWNER_GYM"))));
        h.moderation.hideComment(MOBILE, commentId, new Moderate("member warned", "AUTHOR_GYM"));

        // Hidden from everyone else; Jessica still sees her own comment.
        h.asOutsider();
        assertTrue(h.community.comments(MOBILE, postId).isEmpty());
        h.asJessica();
        assertEquals(1, h.community.comments(MOBILE, postId).size());

        // Lifting one scope leaves the other in force.
        h.asGymAAdmin();
        h.moderation.restoreComment(MOBILE, commentId, new Moderate("reviewed", "POST_OWNER_GYM"));
        h.asOutsider();
        assertTrue(h.community.comments(MOBILE, postId).isEmpty());
    }

    @Test
    void scenarioD_gymAHasNoAuthorityOverGymBCommentsOnGymBPosts() {
        h.asJessica();
        long postId = h.community.createPost(mobile("gym-b"), post("gym-b")).id();
        h.asJohn();
        long commentId = h.community.addComment(mobile("gym-b"), postId, new CreateComment("from John as a B member", "gym-b")).id();
        h.asGymAAdmin();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hideComment(MOBILE, commentId, null)));
    }

    // ── E: global and platform accounts never moderate ──────────────────────

    @Test
    void scenarioE_globalAndPlatformAccountsCannotModerate() {
        long id = johnPostsFromGymA().id();
        h.asJessica();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hidePost(MOBILE, id, null)));
        h.asPlatform();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hidePost(MOBILE, id, null)));
        assertEquals("PLATFORM_CANNOT_POST", code(() -> h.community.createPost(MOBILE, post(null))));
        assertEquals("PLATFORM_CANNOT_POST", code(() -> h.community.like(MOBILE, id)));
        assertEquals("NOT_A_MODERATOR", code(() -> h.moderation.queue(MOBILE)));
    }

    @Test
    void staffWithoutModeratePermissionCannotModerate() {
        long id = johnPostsFromGymA().id();
        h.asGymATrainer();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hidePost(MOBILE, id, null)));
    }

    // ── F: multi-gym member ─────────────────────────────────────────────────

    @Test
    void scenarioF_multiGymMemberPostingFromGymBGivesAuthorityOnlyToGymB() {
        h.asJohn();
        GlobalCommunityDtos.Post p = h.community.createPost(mobile("gym-a"), post("gym-b"));
        assertEquals("gym-b", p.author().gymSlug());
        h.asGymAAdmin();
        assertEquals("NOT_ALLOWED", code(() -> h.moderation.hidePost(MOBILE, p.id(), null)));
        h.asGymBAdmin();
        assertEquals("HIDDEN", h.moderation.hidePost(MOBILE, p.id(), null).status());
    }

    // ── G / H / I / J: gym context is a request, not authorization ──────────

    @Test
    void scenarioG_cannotPostAsAnotherGym() {
        h.asJessica();
        assertEquals("NOT_A_MEMBER", code(() -> h.community.createPost(mobile("gym-a"), post("gym-a"))));
        assertEquals("NOT_A_MEMBER", code(() -> h.community.createPost(mobile("gym-b"), post("gym-a"))));
    }

    @Test
    void scenarioH_withoutMembershipYouCanReadAndLikeButNotPostOrComment() {
        long id = johnPostsFromGymA().id();
        h.asOutsider();
        assertEquals("NOT_A_MEMBER", code(() -> h.community.createPost(mobile("gym-a"), post("gym-a"))));
        assertEquals("GYM_CONTEXT_REQUIRED", code(() -> h.community.createPost(MOBILE, post(null))));
        assertEquals("GYM_CONTEXT_REQUIRED", code(() -> h.community.addComment(MOBILE, id, new CreateComment("hi", null))));
        assertTrue(h.community.like(MOBILE, id).liked());
        assertEquals(id, h.community.post(MOBILE, id).id());
    }

    @Test
    void scenarioI_pendingAppAccessBlocksPosting() {
        h.asPending();
        assertEquals("APP_ACCESS_PENDING", code(() -> h.community.createPost(mobile("gym-a"), post("gym-a"))));
    }

    @Test
    void scenarioJ_staffCannotSwitchGymBySupplyingAnother() {
        h.asGymAAdmin();
        assertEquals("GYM_CONTEXT_MISMATCH", code(() -> h.community.createPost(mobile("gym-b"), post("gym-b"))));
        // A selected-gym header is only a hint and never changes a staff member's gym.
        GlobalCommunityDtos.Post p = h.community.createPost(mobile("gym-b"), post(null));
        assertEquals("gym-a", p.author().gymSlug());
    }

    // ── K: likes are unique and counters exact under concurrency ────────────

    @Test
    void scenarioK_concurrentLikesStayUniqueAndCountersExact() throws Exception {
        long id = johnPostsFromGymA().id();
        int people = 25;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < people; i++) {
            long user = 5000 + i;
            for (int repeat = 0; repeat < 3; repeat++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    h.asGlobal(user);
                    try {
                        h.community.like(MOBILE, id);
                    } finally {
                        h.signOut();
                    }
                    return null;
                }));
            }
        }
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        pool.shutdown();

        h.asJohn();
        assertEquals(people, h.community.post(MOBILE, id).likeCount());
        assertEquals(people, h.controlJdbc.queryForObject("SELECT count(*) FROM global_community_likes WHERE post_id = ?", Integer.class, id));
        assertEquals(0, h.posts.repairCounters(), "counters needed no repair");

        h.asGlobal(5000);
        assertFalse(h.community.unlike(MOBILE, id).liked());
        assertFalse(h.community.unlike(MOBILE, id).liked());
        assertEquals(people - 1, h.community.post(MOBILE, id).likeCount());
    }

    // ── L: deleted/hidden content can't be reached by guessing IDs ──────────

    @Test
    void scenarioL_deletedAndHiddenContentIsNotFoundForOthers() {
        long deleted = johnPostsFromGymA().id();
        h.community.deletePost(MOBILE, deleted);
        for (Runnable who : List.<Runnable>of(h::asJohn, h::asJessica, h::asGymAAdmin)) {
            who.run();
            assertEquals("NOT_FOUND", code(() -> h.community.post(MOBILE, deleted)));
            assertEquals("NOT_FOUND", code(() -> h.community.comments(MOBILE, deleted)));
            assertEquals("NOT_FOUND", code(() -> h.community.like(MOBILE, deleted)));
        }

        long hidden = johnPostsFromGymA().id();
        h.asGymAAdmin();
        h.moderation.hidePost(MOBILE, hidden, null);
        h.asJessica();
        assertEquals("NOT_FOUND", code(() -> h.community.post(MOBILE, hidden)));
        assertEquals("NOT_FOUND", code(() -> h.community.addComment(mobile("gym-b"), hidden, new CreateComment("x", null))));
        h.asJohn();
        assertEquals("HIDDEN", h.community.post(MOBILE, hidden).status(), "the author still sees their hidden post");

        h.asJohn();
        assertEquals("NOT_FOUND", code(() -> h.community.post(MOBILE, 1L)), "legacy-range IDs are never resolved by the new API");
    }

    // ── The identity collision that caused the legacy bug ───────────────────

    @Test
    void globalUser42AndGymALocalUser42AreDifferentPeople() {
        long id = johnPostsFromGymA().id();
        h.community.like(MOBILE, id);

        h.asGymAAdmin();   // tenant-local users.id 42 in gym-a
        GlobalCommunityDtos.Post seenByAdmin = h.community.post(MOBILE, id);
        assertFalse(seenByAdmin.author().isMine());
        assertFalse(seenByAdmin.viewer().likedByMe());
        assertFalse(seenByAdmin.viewer().canDelete());
        assertEquals("NOT_ALLOWED", code(() -> h.community.deletePost(MOBILE, id)));

        h.asJohn();        // global user 42
        GlobalCommunityDtos.Post seenByJohn = h.community.post(MOBILE, id);
        assertTrue(seenByJohn.author().isMine());
        assertTrue(seenByJohn.viewer().likedByMe());
        assertEquals("John Doe", seenByJohn.author().displayName());
        assertEquals(2, h.controlJdbc.queryForObject("SELECT count(*) FROM community_authors "
                + "WHERE global_user_id = 42 OR tenant_user_id = 42", Integer.class));
    }

    // ── Visibility of historical gym-only posts (C2) ────────────────────────

    @Test
    void gymOnlyHistoryIsVisibleOnlyToThatGym() {
        long authorId = h.controlJdbc.queryForObject("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) "
                + "VALUES ('TENANT', 'gym-a', 777, 'Legacy author') RETURNING id", Long.class);
        long legacy = h.controlJdbc.queryForObject("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, "
                + "type, visibility, status, origin, legacy_source, legacy_id, legacy_fingerprint) VALUES (?, 'gym-a', 'Old', "
                + "'gym-only history', 'tip', 'GYM', 'ACTIVE', 'LEGACY', 'tenant:gym-a', 1, 'fp') RETURNING id", Long.class, authorId);

        h.asJessica();
        assertEquals("NOT_FOUND", code(() -> h.community.post(MOBILE, legacy)));
        assertTrue(h.community.feed(MOBILE, null, 50, null, null).posts().stream().noneMatch(p -> p.id() == legacy));
        assertEquals("NOT_A_MEMBER", code(() -> h.community.gymFeed(MOBILE, "gym-a", null, 50, null)));

        h.asJohn();
        assertEquals(legacy, h.community.post(MOBILE, legacy).id());
        assertTrue(h.community.gymFeed(MOBILE, "gym-a", null, 50, null).posts().stream().anyMatch(p -> p.id() == legacy));
        h.asGymAAdmin();
        assertTrue(h.community.gymFeed(MOBILE, "gym-a", null, 50, null).posts().stream().anyMatch(p -> p.id() == legacy));
    }

    // ── Reports route by stored gym, never the viewer's selected gym ────────

    @Test
    void reportsRouteToTheContentsGymAndAreAudited() {
        long id = johnPostsFromGymA().id();
        h.asJessica();
        GlobalCommunityDtos.ReportResult r = h.community.reportPost(mobile("gym-b"), id, new CreateReport("spam", "ads"));
        assertFalse(r.alreadyReported());
        assertTrue(h.community.reportPost(MOBILE, id, new CreateReport("SPAM", null)).alreadyReported());

        h.asGymBAdmin();
        assertEquals("NOT_FOUND", code(() -> h.moderation.resolveReport(MOBILE, r.reportId(), null)));
        assertTrue(h.moderation.queue(MOBILE).openReports().stream().noneMatch(x -> x.id() == r.reportId()));

        h.asGymAAdmin();
        assertTrue(h.moderation.queue(MOBILE).openReports().stream().anyMatch(x -> x.id() == r.reportId()));
        assertEquals("RESOLVED", h.moderation.resolveReport(MOBILE, r.reportId(), new Moderate("removed", null)).status());
        assertEquals("STATE_CHANGED", code(() -> h.moderation.resolveReport(MOBILE, r.reportId(), null)));
    }

    @Test
    void reportAgainstStaffOfTheModeratingGymIsEscalatedImmediately() {
        h.asGymAAdmin();
        long id = h.community.createPost(MOBILE, post(null)).id();
        h.asJohn();
        long reportId = h.community.reportPost(mobile("gym-a"), id, new CreateReport("HARASSMENT", null)).reportId();
        assertEquals("ESCALATED", h.controlJdbc.queryForObject("SELECT status FROM community_reports WHERE id = ?", String.class, reportId));
    }

    // ── Content limits and pagination ───────────────────────────────────────

    @Test
    void contentLimitsAreEnforcedBeforePersistence() {
        h.asJohn();
        int before = h.controlJdbc.queryForObject("SELECT count(*) FROM global_community_posts", Integer.class);
        assertEquals("CONTENT_TOO_LONG", code(() -> h.community.createPost(mobile("gym-a"),
                new CreatePost("t", "x".repeat(1001), "tip", null, null))));
        assertEquals("INVALID_TYPE", code(() -> h.community.createPost(mobile("gym-a"),
                new CreatePost("t", "ok", "event", null, null))));
        assertEquals("IMAGE_TYPE_MISMATCH", code(() -> h.community.createPost(mobile("gym-a"), new CreatePost("t", "ok", "tip", null,
                new GlobalCommunityDtos.ImageUpload("data:image/png;base64,/9j/4AAQSkZJRg==", "1:1", null, null)))));
        assertEquals(before, h.controlJdbc.queryForObject("SELECT count(*) FROM global_community_posts", Integer.class));
    }

    @Test
    void feedPagesWithoutDuplicatesOrGaps() {
        h.asJohn();
        Set<Long> created = new HashSet<>();
        for (int i = 0; i < 7; i++) {
            created.add(h.community.createPost(mobile("gym-a"), post("gym-a")).id());
        }
        Set<Long> seen = new HashSet<>();
        String cursor = null;
        GlobalCommunityDtos.Post previous = null;
        int pages = 0;
        do {
            GlobalCommunityDtos.FeedPage page = h.community.feed(MOBILE, cursor, 3, null, null);
            assertTrue(page.posts().size() <= 3);
            for (GlobalCommunityDtos.Post p : page.posts()) {
                assertTrue(seen.add(p.id()), "duplicate " + p.id());
                if (previous != null) {
                    int byTime = p.createdAt().compareTo(previous.createdAt());
                    assertTrue(byTime < 0 || (byTime == 0 && p.id() < previous.id()),
                            "feed must be strictly newest-first by (created_at, id)");
                }
                previous = p;
            }
            cursor = page.nextCursor();
            pages++;
        } while (cursor != null);
        assertTrue(seen.containsAll(created), "every created post appears exactly once");
        assertTrue(pages >= 3, "7+ posts at 3 per page need at least 3 pages");
    }

    @Test
    void configReportsThePostingGymExactlyAsAPostWouldBeChecked() {
        h.asJohn();
        var ok = h.community.clientConfig(mobile("gym-a"));
        assertTrue(ok.canPost());
        assertEquals("gym-a", ok.postingGymSlug());
        assertEquals("FitZone A", ok.postingGymName());

        h.asJessica();
        var blocked = h.community.clientConfig(mobile("gym-a"));
        assertFalse(blocked.canPost());
        assertFalse(blocked.canComment());
        assertTrue(blocked.canLike(), "liking needs no membership (C3)");
        assertEquals("NOT_A_MEMBER", blocked.postingBlockedReason());

        h.asPending();
        assertEquals("APP_ACCESS_PENDING", h.community.clientConfig(mobile("gym-a")).postingBlockedReason());
    }
}
