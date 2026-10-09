package com.company.project.community.global.policy;

import com.company.project.community.global.identity.CommunityActor;
import com.company.project.community.global.policy.CommunityModerationPolicy.CommentFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.HideScope;
import com.company.project.community.global.policy.CommunityModerationPolicy.PostFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.PostStatus;
import com.company.project.community.global.policy.CommunityModerationPolicy.ReportFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.Viewer;
import com.company.project.community.global.policy.CommunityModerationPolicy.Visibility;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static com.company.project.community.global.policy.CommunityModerationPolicy.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The permission matrix, including the approved security scenarios A–F.
 * John (author 1) is a Gym A member; Jessica (author 2) is a Gym B member.
 */
class CommunityModerationPolicyTest {

    private static final long JOHN = 1, JESSICA = 2, GYM_A_ADMIN = 10, GYM_B_ADMIN = 20;
    private static final Set<String> MODERATE = Set.of("COMMUNITY_MODERATE", "COMMUNITY_VIEW");

    private static Viewer gymAdmin(String gym, long authorId) {
        return new Viewer(CommunityActor.tenant(gym, authorId, "ADMIN", MODERATE), authorId, gym, true);
    }

    private static Viewer member(long globalUserId, long authorId, String verifiedGym) {
        return new Viewer(CommunityActor.global(globalUserId), authorId, verifiedGym, true);
    }

    private static PostFacts johnsPost(PostStatus status) {
        return new PostFacts(JOHN, "gym-a", status, Visibility.PUBLIC);
    }

    private static CommentFacts jessicasCommentOnJohnsPost(Set<HideScope> hides) {
        return new CommentFacts(JESSICA, "gym-b", false, hides, johnsPost(PostStatus.ACTIVE));
    }

    // ── Scenario A/B: post moderation is scoped to the author's gym ─────────

    @Test
    void scenarioA_gymAAdminCanModerateGymAMembersPost() {
        assertTrue(canHide(gymAdmin("gym-a", GYM_A_ADMIN), johnsPost(PostStatus.ACTIVE)));
        assertTrue(canRestore(gymAdmin("gym-a", GYM_A_ADMIN), johnsPost(PostStatus.HIDDEN)));
    }

    @Test
    void scenarioB_gymBAdminCannotModerateGymAMembersPost() {
        Viewer gymB = gymAdmin("gym-b", GYM_B_ADMIN);
        assertTrue(canView(gymB, johnsPost(PostStatus.ACTIVE)), "cross-gym visibility is allowed");
        assertFalse(canHide(gymB, johnsPost(PostStatus.ACTIVE)));
        assertFalse(canRestore(gymB, johnsPost(PostStatus.HIDDEN)));
        assertFalse(canDelete(gymB, johnsPost(PostStatus.ACTIVE)));
        assertFalse(canView(gymB, johnsPost(PostStatus.HIDDEN)), "other gyms can't see hidden content");
    }

    // ── Scenario C/D: comments ──────────────────────────────────────────────

    @Test
    void scenarioC_gymBMemberCanCommentOnGymAMembersPost() {
        assertTrue(canInteract(member(200, JESSICA, "gym-b"), johnsPost(PostStatus.ACTIVE)));
    }

    @Test
    void scenarioD_gymAAdminHidesJessicasCommentOnlyUnderPostOwnerScope() {
        Viewer gymA = gymAdmin("gym-a", GYM_A_ADMIN);
        CommentFacts onJohnsPost = jessicasCommentOnJohnsPost(Set.of());
        assertEquals(Set.of(HideScope.POST_OWNER_GYM), hideScopes(gymA, onJohnsPost));
        assertFalse(canHide(gymA, onJohnsPost, HideScope.AUTHOR_GYM));
        assertFalse(canDelete(gymA, onJohnsPost));

        // The same comment on a Gym C member's post: Gym A has no authority at all.
        CommentFacts onGymCPost = new CommentFacts(JESSICA, "gym-b", false, Set.of(),
                new PostFacts(99, "gym-c", PostStatus.ACTIVE, Visibility.PUBLIC));
        assertTrue(hideScopes(gymA, onGymCPost).isEmpty());
    }

    @Test
    void commentersGymModeratesItsMemberEverywhere() {
        Viewer gymB = gymAdmin("gym-b", GYM_B_ADMIN);
        assertEquals(Set.of(HideScope.AUTHOR_GYM), hideScopes(gymB, jessicasCommentOnJohnsPost(Set.of())));
    }

    @Test
    void scopesAreIndependent_eachCanOnlyLiftItsOwnHide() {
        CommentFacts hiddenByBoth = jessicasCommentOnJohnsPost(Set.of(HideScope.AUTHOR_GYM, HideScope.POST_OWNER_GYM));
        Viewer gymA = gymAdmin("gym-a", GYM_A_ADMIN);
        Viewer gymB = gymAdmin("gym-b", GYM_B_ADMIN);
        assertTrue(canRestore(gymA, hiddenByBoth, HideScope.POST_OWNER_GYM));
        assertFalse(canRestore(gymA, hiddenByBoth, HideScope.AUTHOR_GYM));
        assertTrue(canRestore(gymB, hiddenByBoth, HideScope.AUTHOR_GYM));
        assertFalse(canRestore(gymB, hiddenByBoth, HideScope.POST_OWNER_GYM));
        assertFalse(canHide(gymA, hiddenByBoth, HideScope.POST_OWNER_GYM), "already hidden in that scope");
    }

    @Test
    void hiddenCommentVisibleOnlyToItsAuthorAndModeratorsWithAScope() {
        CommentFacts hidden = jessicasCommentOnJohnsPost(Set.of(HideScope.AUTHOR_GYM));
        assertTrue(canView(member(200, JESSICA, "gym-b"), hidden));
        assertTrue(canView(gymAdmin("gym-a", GYM_A_ADMIN), hidden));
        assertFalse(canView(member(100, JOHN, "gym-a"), hidden));
        assertFalse(canView(gymAdmin("gym-c", 30), hidden));
    }

    // ── Scenario E: global/platform accounts never moderate in v1 ───────────

    @Test
    void scenarioE_globalAndPlatformAccountsCannotModerate() {
        Viewer global = member(100, 555, "gym-a");
        Viewer platform = new Viewer(CommunityActor.platform(1), null, null, true);
        for (Viewer v : new Viewer[]{global, platform}) {
            assertFalse(canHide(v, johnsPost(PostStatus.ACTIVE)));
            assertTrue(hideScopes(v, jessicasCommentOnJohnsPost(Set.of())).isEmpty());
        }
        assertFalse(canInteract(platform, johnsPost(PostStatus.ACTIVE)), "platform accounts don't interact in v1");
    }

    @Test
    void staffWithoutModeratePermissionCannotModerateOwnGym() {
        Viewer trainer = new Viewer(CommunityActor.tenant("gym-a", 11, "TRAINER", Set.of("COMMUNITY_VIEW")), 11L, "gym-a", true);
        assertFalse(canHide(trainer, johnsPost(PostStatus.ACTIVE)));
    }

    @Test
    void moderationFlagOffDisablesAllModeration() {
        Viewer gymAOff = new Viewer(CommunityActor.tenant("gym-a", GYM_A_ADMIN, "ADMIN", MODERATE), GYM_A_ADMIN, "gym-a", false);
        assertFalse(canHide(gymAOff, johnsPost(PostStatus.ACTIVE)));
        assertTrue(hideScopes(gymAOff, jessicasCommentOnJohnsPost(Set.of())).isEmpty());
    }

    // ── Scenario F: multi-gym member ────────────────────────────────────────

    @Test
    void scenarioF_postFromGymAIsModeratedOnlyByGymAEvenIfAuthorAlsoBelongsToGymB() {
        // The post records only the gym it was written from; the author's other
        // memberships are irrelevant to authority.
        PostFacts fromGymA = new PostFacts(JOHN, "gym-a", PostStatus.ACTIVE, Visibility.PUBLIC);
        assertTrue(canHide(gymAdmin("gym-a", GYM_A_ADMIN), fromGymA));
        assertFalse(canHide(gymAdmin("gym-b", GYM_B_ADMIN), fromGymA));
    }

    // ── Author lifecycle and visibility ─────────────────────────────────────

    @Test
    void onlyTheAuthorArchivesRestoresAndDeletes() {
        Viewer john = member(100, JOHN, "gym-a");
        Viewer admin = gymAdmin("gym-a", GYM_A_ADMIN);
        assertTrue(canArchive(john, johnsPost(PostStatus.ACTIVE)));
        assertTrue(canUnarchive(john, johnsPost(PostStatus.ARCHIVED)));
        assertTrue(canDelete(john, johnsPost(PostStatus.HIDDEN)));
        assertFalse(canArchive(admin, johnsPost(PostStatus.ACTIVE)));
        assertFalse(canDelete(admin, johnsPost(PostStatus.ACTIVE)), "moderators hide; they don't delete (C6)");
    }

    @Test
    void deletedContentIsVisibleToNobody() {
        assertFalse(canView(member(100, JOHN, "gym-a"), johnsPost(PostStatus.DELETED)));
        assertFalse(canView(gymAdmin("gym-a", GYM_A_ADMIN), johnsPost(PostStatus.DELETED)));
    }

    @Test
    void gymOnlyPostsNeedAVerifiedGym() {
        PostFacts legacyGymPost = new PostFacts(JOHN, "gym-a", PostStatus.ACTIVE, Visibility.GYM);
        assertTrue(canView(member(300, 3, "gym-a"), legacyGymPost));
        assertFalse(canView(member(300, 3, "gym-b"), legacyGymPost));
        assertFalse(canView(member(300, 3, null), legacyGymPost));
        assertTrue(canView(gymAdmin("gym-a", GYM_A_ADMIN), legacyGymPost));
    }

    @Test
    void cannotInteractWithArchivedOrHiddenPosts() {
        Viewer jessica = member(200, JESSICA, "gym-b");
        assertFalse(canInteract(jessica, johnsPost(PostStatus.ARCHIVED)));
        assertFalse(canInteract(jessica, johnsPost(PostStatus.HIDDEN)));
        assertFalse(canReport(member(100, JOHN, "gym-a"), johnsPost(PostStatus.ACTIVE)), "no self-reports");
        assertTrue(canReport(jessica, johnsPost(PostStatus.ACTIVE)));
    }

    // ── Report routing ──────────────────────────────────────────────────────

    @Test
    void reportsRouteToTheStoredGymsNotTheViewersActiveGym() {
        ReportFacts jessicasCommentReport = new ReportFacts("gym-b", "gym-a");
        assertEquals(Set.of(HideScope.AUTHOR_GYM), reportScopes(gymAdmin("gym-b", GYM_B_ADMIN), jessicasCommentReport));
        assertEquals(Set.of(HideScope.POST_OWNER_GYM), reportScopes(gymAdmin("gym-a", GYM_A_ADMIN), jessicasCommentReport));
        assertTrue(reportScopes(gymAdmin("gym-c", 30), jessicasCommentReport).isEmpty());
        assertTrue(reportScopes(member(100, JOHN, "gym-b"), jessicasCommentReport).isEmpty());
    }
}
