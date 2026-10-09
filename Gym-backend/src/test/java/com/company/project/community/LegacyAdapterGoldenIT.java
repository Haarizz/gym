package com.company.project.community;

import com.company.project.community.global.CommunityException;
import com.company.project.community.support.CommunityHarness;
import com.company.project.dto.CommunityPostCommentResponseDTO;
import com.company.project.dto.CommunityPostResponseDTO;
import com.company.project.dto.CommunityPostsPageResponseDTO;
import com.company.project.dto.CreateCommunityCommentRequestDTO;
import com.company.project.dto.CreateCommunityPostRequestDTO;
import com.company.project.entities.CommunityPost;
import com.company.project.entities.CommunityPostComment;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.CommunityService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Phase 5 golden tests. For every legacy endpoint, the adapter's JSON must have
 * exactly the shape the real legacy CommunityService produced (same field
 * names and JSON types at every level), and the adapter must keep the old
 * clients' gym-scoped semantics while serving the global store.
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
class LegacyAdapterGoldenIT {

    private static final String PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    private static final ObjectMapper JSON = new ObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static CommunityHarness h;
    private static CommunityService legacy;
    private static long legacyGymAPostGlobalId;

    @BeforeAll
    static void start() throws Exception {
        h = new CommunityHarness();
        h.enableEverything();
        legacy = legacyServiceWithOneOfEverything();

        // A migrated legacy row of gym-a (legacy_id 5) and a different gym-b row with the same legacy id.
        long a = h.controlJdbc.queryForObject("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name, primary_role) "
                + "VALUES ('TENANT', 'gym-a', 77, 'Legacy Staff', 'MANAGER') RETURNING id", Long.class);
        long b = h.controlJdbc.queryForObject("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name, primary_role) "
                + "VALUES ('TENANT', 'gym-b', 77, 'Other Gym Staff', 'MANAGER') RETURNING id", Long.class);
        legacyGymAPostGlobalId = h.controlJdbc.queryForObject("INSERT INTO global_community_posts (author_id, author_tenant_slug, "
                + "author_branch_id, topic, content, type, visibility, status, origin, legacy_source, legacy_id, legacy_fingerprint, created_at) "
                + "VALUES (?, 'gym-a', 10, 'Old news', 'from before', 'tip', 'GYM', 'ACTIVE', 'LEGACY', 'tenant:gym-a', 5, 'fp', "
                + "'2026-08-01 10:00:00') RETURNING id", Long.class, a);
        h.controlJdbc.update("INSERT INTO global_community_posts (author_id, author_tenant_slug, author_branch_id, topic, content, "
                + "type, visibility, status, origin, legacy_source, legacy_id, legacy_fingerprint, created_at) VALUES (?, 'gym-b', 20, "
                + "'B old', 'gym-b history', 'tip', 'GYM', 'ACTIVE', 'LEGACY', 'tenant:gym-b', 5, 'fp', '2026-08-01 10:00:00')", b);
    }

    @AfterAll
    static void stop() throws Exception {
        h.close();
    }

    @AfterEach
    void reset() {
        BranchContextHolder.clear();
        SecurityContextHolder.clearContext();
        h.signOut();
    }

    // ── The real legacy output, used as the golden reference ────────────────

    private static CommunityService legacyServiceWithOneOfEverything() {
        CommunityPostRepository postRepo = mock(CommunityPostRepository.class);
        CommunityPostCommentRepository commentRepo = mock(CommunityPostCommentRepository.class);
        CommunityPostLikeRepository likeRepo = mock(CommunityPostLikeRepository.class);
        UserRepository userRepo = mock(UserRepository.class);

        User author = new User();
        author.setId(7L);
        author.setUsername("staff@example.com");
        UserRole ur = new UserRole(1L, author, new Role("MANAGER"));
        author.setUserRoles(Set.of(ur));

        CommunityPost post = new CommunityPost();
        post.setId(5L);
        post.setAuthorUser(author);
        post.setTopic("Old news");
        post.setContent("from before");
        post.setType("tip");
        post.setImageDataUrl(PNG);
        post.setImageAspectRatio("1:1");
        post.setImageCropPosition(50);
        post.setImageCropZoom(100);
        post.setLikeCount(1);
        post.setCommentCount(1);
        post.setCreatedAt(LocalDateTime.of(2026, 8, 1, 10, 0));

        CommunityPostComment comment = new CommunityPostComment();
        comment.setId(9L);
        comment.setPost(post);
        comment.setAuthorUser(author);
        comment.setContent("hi");
        comment.setCreatedAt(LocalDateTime.of(2026, 8, 1, 11, 0));

        when(postRepo.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(post), (Pageable) inv.getArgument(1), 1));
        when(postRepo.findAll()).thenReturn(List.of(post));
        when(postRepo.findById(5L)).thenReturn(Optional.of(post));
        when(postRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(commentRepo.findByPostIdOrderByCreatedAtAsc(5L)).thenReturn(List.of(comment));
        when(commentRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(likeRepo.findLikedPostIds(anyLong(), anyList())).thenReturn(List.of(5L));
        when(likeRepo.findByPostIdAndUserId(anyLong(), anyLong())).thenReturn(Optional.empty());
        when(userRepo.findById(7L)).thenReturn(Optional.of(author));
        return new CommunityService(postRepo, commentRepo, likeRepo, userRepo,
                org.mockito.Mockito.mock(com.company.project.repositories.MemberRepository.class),
                org.mockito.Mockito.mock(com.company.project.services.NotificationService.class),
                org.mockito.Mockito.mock(com.company.project.services.GlobalMembershipService.class));
    }

    private static void asLegacyStaff() {
        UserDetailsImpl p = new UserDetailsImpl(7L, "staff", "s@x", "pw", List.of(), true, false);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(p, null, List.of()));
    }

    private static JsonNode json(Object o) {
        return JSON.valueToTree(o);
    }

    /** Same field names and JSON types at every level; null matches anything; arrays compared by first element. */
    private static void assertSameShape(JsonNode golden, JsonNode actual, String path) {
        if (golden.isNull() || actual.isNull()) {
            return;
        }
        assertEquals(golden.getNodeType(), actual.getNodeType(), "type differs at " + path);
        if (golden.isObject()) {
            Set<String> g = new TreeSet<>(), a = new TreeSet<>();
            golden.fieldNames().forEachRemaining(g::add);
            actual.fieldNames().forEachRemaining(a::add);
            assertEquals(g, a, "fields differ at " + path);
            for (Iterator<String> it = golden.fieldNames(); it.hasNext(); ) {
                String f = it.next();
                assertSameShape(golden.get(f), actual.get(f), path + "." + f);
            }
        } else if (golden.isArray() && golden.size() > 0 && actual.size() > 0) {
            assertSameShape(golden.get(0), actual.get(0), path + "[0]");
        }
    }

    // ── Golden shape per endpoint ───────────────────────────────────────────

    @Test
    void everyEndpointKeepsTheLegacyShape() {
        asLegacyStaff();
        JsonNode goldenFeed = json(legacy.getFeed(null, null, 1, 20, false));
        JsonNode goldenComments = json(legacy.getComments(5L));
        JsonNode goldenComment = json(legacy.addComment(5L, comment("hi")));
        JsonNode goldenLike = json(legacy.toggleLike(5L));
        JsonNode goldenPost = json(legacy.archivePost(5L));
        JsonNode goldenStats = json(legacy.getEngagementStats());
        JsonNode goldenTrending = json(legacy.getTrendingTopics());
        JsonNode goldenLeaderboard = json(legacy.getLeaderboard());
        SecurityContextHolder.clearContext();

        h.asGymAAdmin();
        CommunityPostResponseDTO created = h.adapter.createPost(post("Gym A news", PNG));
        assertSameShape(goldenPost, json(created), "createPost");
        assertSameShape(goldenFeed, json(h.adapter.getFeed(null, null, 1, 20, false)), "getFeed");
        assertSameShape(goldenComment, json(h.adapter.addComment(created.getId(), comment("hi"))), "addComment");
        assertSameShape(goldenComments, json(h.adapter.getComments(created.getId())), "getComments");
        assertSameShape(goldenLike, json(h.adapter.toggleLike(created.getId())), "toggleLike");
        assertSameShape(goldenPost, json(h.adapter.setArchived(created.getId(), true)), "archive");
        assertSameShape(goldenPost, json(h.adapter.setArchived(created.getId(), false)), "unarchive");
        assertSameShape(goldenStats, json(h.adapter.getEngagementStats()), "stats");
        assertSameShape(goldenTrending, json(h.adapter.getTrendingTopics()), "trending");
        assertSameShape(goldenLeaderboard, json(h.adapter.getLeaderboard()), "leaderboard");
    }

    // ── Semantics old clients rely on ───────────────────────────────────────

    @Test
    void oldClientsSeeOnlyTheirGymAndPostsTheyWriteStayGymOnly() {
        h.asJessica();
        h.header("X-Tenant-ID", "gym-b");
        long bPost = h.adapter.createPost(post("B only", null)).getId();
        assertEquals("GYM", h.controlJdbc.queryForObject("SELECT visibility FROM global_community_posts WHERE id = ?", String.class, bPost));

        h.asGymAAdmin();
        CommunityPostsPageResponseDTO feed = h.adapter.getFeed(null, null, 1, 50, false);
        assertTrue(feed.getPosts().stream().noneMatch(p -> p.getId() == bPost), "gym-b post must not reach gym-a's old client");
        assertEquals("Post not found", assertThrows(IllegalArgumentException.class, () -> h.adapter.toggleLike(bPost)).getMessage());

        h.asOutsider();
        assertTrue(h.community.feed(com.company.project.community.support.CommunityHarness.MOBILE, null, 50, null, null)
                .posts().stream().noneMatch(p -> p.id() == bPost), "gym-only post isn't in the public feed");
    }

    @Test
    void legacyIdsResolveThroughTheStoredKeyWithinTheCallersGym() {
        h.asGymAAdmin();
        assertTrue(h.adapter.getComments(5L).isEmpty(), "legacy id 5 of gym-a resolves (no comments yet)");
        assertTrue(h.adapter.toggleLike(5L).isLiked());
        assertEquals(1, h.controlJdbc.queryForObject("SELECT count(*) FROM global_community_likes WHERE post_id = ?",
                Integer.class, legacyGymAPostGlobalId), "the like landed on gym-a's migrated row");
        CommunityPostsPageResponseDTO feed = h.adapter.getFeed(null, null, 1, 50, false);
        assertTrue(feed.getPosts().stream().anyMatch(p -> p.getId() == legacyGymAPostGlobalId), "the migrated row appears with its global id");

        h.asGymBAdmin();
        // gym-b's own legacy id 5 is a different post; gym-a's global id is outside gym-b's scope.
        assertTrue(h.adapter.toggleLike(5L).isLiked());
        assertEquals(1, h.controlJdbc.queryForObject("SELECT count(*) FROM global_community_likes WHERE post_id = ?",
                Integer.class, legacyGymAPostGlobalId), "gym-b's like did not touch gym-a's post");
        assertEquals("Post not found", assertThrows(IllegalArgumentException.class,
                () -> h.adapter.toggleLike(legacyGymAPostGlobalId)).getMessage());
        assertEquals("Post not found", assertThrows(IllegalArgumentException.class, () -> h.adapter.toggleLike(424242L)).getMessage());
    }

    @Test
    void toggleLikeTogglesAndAuthorIdsUseTheAuthorsOwnIdentitySpace() {
        h.asJohn();
        h.header("X-Tenant-ID", "gym-a");
        CommunityPostResponseDTO p = h.adapter.createPost(post("John via old app", null));
        assertEquals(42L, p.getAuthorUserId(), "app member: global user id");
        assertEquals(List.of("MEMBER"), p.getAuthorRoles());
        assertEquals("John Doe", p.getAuthorUsername(), "display name, never the login username");
        assertTrue(h.adapter.toggleLike(p.getId()).isLiked());
        assertFalse(h.adapter.toggleLike(p.getId()).isLiked());

        h.asGymAAdmin();
        CommunityPostResponseDTO staffPost = h.adapter.createPost(post("Staff via old web", null));
        assertEquals(42L, staffPost.getAuthorUserId(), "staff: tenant-local id (42 here too — a different person)");
        assertEquals(List.of("ADMIN"), staffPost.getAuthorRoles());
        assertFalse(h.adapter.getFeed(null, null, 1, 50, false).getPosts().stream()
                .filter(x -> x.getId().equals(p.getId())).findFirst().orElseThrow().isLikedByMe());
    }

    @Test
    void branchScopeAndArchivedListingMatchTheLegacyRules() {
        h.asGymAAdmin();
        CommunityPostResponseDTO mine = h.adapter.createPost(post("Archive me", null));
        h.adapter.setArchived(mine.getId(), true);
        assertTrue(h.adapter.getFeed(null, null, 1, 50, true).getPosts().stream().anyMatch(x -> x.getId().equals(mine.getId())));
        assertTrue(h.adapter.getFeed(null, null, 1, 50, false).getPosts().stream().noneMatch(x -> x.getId().equals(mine.getId())));

        h.asJohn();
        h.header("X-Tenant-ID", "gym-a");
        assertTrue(h.adapter.getFeed(null, null, 1, 50, true).getPosts().stream().noneMatch(x -> x.getId().equals(mine.getId())),
                "only the author sees their archived posts");

        BranchContextHolder.setActiveBranchId(999L);
        assertTrue(h.adapter.getFeed(null, null, 1, 50, false).getPosts().isEmpty(), "another branch sees nothing of branch 10");
    }

    @Test
    void membershipIsNowCheckedForAppMembers() {
        h.asJessica();
        h.header("X-Tenant-ID", "gym-a");
        assertEquals("NOT_A_MEMBER", assertThrows(CommunityException.class, () -> h.adapter.getFeed(null, null, 1, 20, false)).getCode());
    }

    @Test
    void permissionsAndLimitsSurfaceAsTheLegacyErrorTypes() {
        h.asGymAAdmin();
        long adminPost = h.adapter.createPost(post("Admin's", null)).getId();
        h.asJohn();
        h.header("X-Tenant-ID", "gym-a");
        assertEquals("Not allowed to delete this post",
                assertThrows(SecurityException.class, () -> h.adapter.deletePost(adminPost)).getMessage());
        CreateCommunityPostRequestDTO tooLong = post("t", null);
        tooLong.setContent("x".repeat(1001));
        assertEquals("CONTENT_TOO_LONG", assertThrows(CommunityException.class, () -> h.adapter.createPost(tooLong)).getCode());
    }

    @Test
    void theAdapterFailsClosedOnceGlobalHasBeenSeen() {
        assertTrue(h.adapter.isActive());
        // Even if the state can no longer be read, this process never falls back to the legacy tables.
        h.controlJdbc.execute("ALTER TABLE community_rollout_state RENAME TO community_rollout_state_x");
        try {
            assertTrue(h.adapter.isActive());
        } finally {
            h.controlJdbc.execute("ALTER TABLE community_rollout_state_x RENAME TO community_rollout_state");
        }
    }

    private static CreateCommunityPostRequestDTO post(String topic, String image) {
        CreateCommunityPostRequestDTO dto = new CreateCommunityPostRequestDTO();
        dto.setTopic(topic);
        dto.setContent("content of " + topic);
        dto.setType("tip");
        dto.setImageDataUrl(image);
        dto.setImageAspectRatio(image == null ? null : "1:1");
        return dto;
    }

    private static CreateCommunityCommentRequestDTO comment(String text) {
        CreateCommunityCommentRequestDTO dto = new CreateCommunityCommentRequestDTO();
        dto.setContent(text);
        return dto;
    }

}
