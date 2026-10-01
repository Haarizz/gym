package com.company.project.services;

import com.company.project.dto.CreateCommunityCommentRequestDTO;
import com.company.project.dto.CreateCommunityPostRequestDTO;
import com.company.project.entities.CommunityPost;
import com.company.project.entities.CommunityPostComment;
import com.company.project.entities.CommunityPostLike;
import com.company.project.entities.Member;
import com.company.project.entities.User;
import com.company.project.exceptions.CommunityMembershipRequiredException;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * GymBios app accounts (global principals) can read any gym's community. They
 * can like and comment once they hold an active membership at any gym, and post
 * only with an active membership in this gym. Their ID is a primary-DB users.id,
 * so it must only ever be matched against members.global_user_id (or the
 * global-account columns of likes/comments) — never tenant users.id / members.user_id.
 */
class CommunityServiceAppAccountTest {

    private static final long GLOBAL_ID = 42L;
    private static final long MEMBER_ID = 900L;

    @Mock private CommunityPostRepository postRepository;
    @Mock private CommunityPostCommentRepository commentRepository;
    @Mock private CommunityPostLikeRepository likeRepository;
    @Mock private UserRepository userRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private NotificationService notificationService;
    @Mock private GlobalMembershipService globalMembershipService;

    private CommunityService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new CommunityService(postRepository, commentRepository, likeRepository, userRepository,
                memberRepository, notificationService, globalMembershipService);
        TenantContextHolder.setCurrentTenant("demo-gym");
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(inv -> inv.getArgument(0));
        when(commentRepository.save(any(CommunityPostComment.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
        TenantContextHolder.clear();
    }

    private void authenticate(long id, boolean global) {
        UserDetailsImpl principal = new UserDetailsImpl(id, "u" + id, "u" + id + "@x", "pw", List.of(), true, global);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private Member memberInThisGym(Boolean appAccessEnabled) {
        return memberInThisGym(appAccessEnabled, "active");
    }

    private Member memberInThisGym(Boolean appAccessEnabled, String membershipStatus) {
        Member member = new Member();
        member.setId(MEMBER_ID);
        member.setName("Asha Menon");
        member.setGlobalUserId(GLOBAL_ID);
        member.setAppAccessEnabled(appAccessEnabled);
        member.setMembershipStatus(membershipStatus);
        when(memberRepository.findByGlobalUserId(GLOBAL_ID)).thenReturn(Optional.of(member));
        return member;
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("staff" + id);
        user.setUserRoles(new HashSet<>());
        return user;
    }

    private static CommunityPost postBy(User authorUser, Member authorMember) {
        CommunityPost post = new CommunityPost();
        post.setId(7L);
        post.setTopic("Leg day PR");
        post.setContent("content");
        post.setAuthorUser(authorUser);
        post.setAuthorMember(authorMember);
        return post;
    }

    private static CreateCommunityPostRequestDTO postRequest() {
        CreateCommunityPostRequestDTO request = new CreateCommunityPostRequestDTO();
        request.setTopic("topic");
        request.setContent("content");
        return request;
    }

    @SuppressWarnings("unchecked")
    private void feedReturns(CommunityPost... posts) {
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(posts)));
    }

    @Test
    void appAccountWithoutMembershipCanReadButNotPost() {
        authenticate(GLOBAL_ID, true);
        when(memberRepository.findByGlobalUserId(GLOBAL_ID)).thenReturn(Optional.empty());
        feedReturns(postBy(user(3L), null));

        var page = service.getFeed(null, null, 1, 20, false);
        assertEquals(1, page.getPosts().size());
        assertFalse(page.isCanPost());
        assertFalse(page.isCanInteract());

        CreateCommunityCommentRequestDTO comment = new CreateCommunityCommentRequestDTO();
        comment.setContent("hi");
        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
        assertThrows(CommunityMembershipRequiredException.class, () -> service.addComment(7L, comment));
        assertThrows(CommunityMembershipRequiredException.class, () -> service.toggleLike(7L));
        verify(postRepository, never()).save(any());
        verify(userRepository, never()).findById(anyLong());
        // No members.user_id fallback: a global ID there could hit an unrelated tenant user.
        verify(memberRepository, never()).findByUserId(anyLong());
    }

    @Test
    void appAccountWithoutGymSelectedIsReadOnlyAndNeverQueriesMembers() {
        TenantContextHolder.clear();
        authenticate(GLOBAL_ID, true);
        feedReturns();

        assertFalse(service.getFeed(null, null, 1, 20, false).isCanPost());
        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
        verify(memberRepository, never()).findByGlobalUserId(anyLong());
    }

    @Test
    void appAccountAwaitingPaymentApprovalCannotPost() {
        authenticate(GLOBAL_ID, true);
        memberInThisGym(false);
        feedReturns();

        assertFalse(service.getFeed(null, null, 1, 20, false).isCanPost());
        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
    }

    @Test
    void appAccountWithMembershipPostsAsTheirMember() {
        authenticate(GLOBAL_ID, true);
        Member member = memberInThisGym(true);

        var response = service.createPost(postRequest());

        ArgumentCaptor<CommunityPost> saved = ArgumentCaptor.forClass(CommunityPost.class);
        verify(postRepository).save(saved.capture());
        assertSame(member, saved.getValue().getAuthorMember());
        assertNull(saved.getValue().getAuthorUser());
        assertEquals(MEMBER_ID, response.getAuthorMemberId());
        assertNull(response.getAuthorUserId());
        assertEquals("Asha Menon", response.getAuthorUsername());
        assertEquals(List.of("MEMBER"), response.getAuthorRoles());
        assertTrue(response.isOwnedByMe());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void appAccountWithMembershipCommentsAndLikesAsTheirMember() {
        authenticate(GLOBAL_ID, true);
        Member member = memberInThisGym(null);
        User author = user(3L);
        when(postRepository.findById(7L)).thenReturn(Optional.of(postBy(author, null)));
        when(likeRepository.findByPostIdAndMemberId(7L, MEMBER_ID)).thenReturn(Optional.empty());

        CreateCommunityCommentRequestDTO comment = new CreateCommunityCommentRequestDTO();
        comment.setContent("Nice!");
        var commentResponse = service.addComment(7L, comment);
        var likeResponse = service.toggleLike(7L);

        assertEquals(MEMBER_ID, commentResponse.getAuthorMemberId());
        assertTrue(commentResponse.isOwnedByMe());
        assertTrue(likeResponse.isLiked());
        ArgumentCaptor<CommunityPostLike> like = ArgumentCaptor.forClass(CommunityPostLike.class);
        verify(likeRepository).save(like.capture());
        assertSame(member, like.getValue().getMember());
        assertNull(like.getValue().getUser());
        verify(likeRepository, never()).findByPostIdAndUserId(anyLong(), anyLong());
    }

    @Test
    void memberIdNeverMatchesATenantUserWithTheSameNumber() {
        authenticate(GLOBAL_ID, true);
        memberInThisGym(true);
        // A staff post whose author users.id equals this app account's member id.
        CommunityPost staffPost = postBy(user(MEMBER_ID), null);
        when(postRepository.findById(7L)).thenReturn(Optional.of(staffPost));
        feedReturns(staffPost);
        when(likeRepository.findLikedPostIdsByMember(MEMBER_ID, List.of(7L))).thenReturn(List.of());

        var page = service.getFeed(null, null, 1, 20, false);

        assertTrue(page.isCanPost());
        assertTrue(page.isCanInteract());
        assertFalse(page.getPosts().get(0).isOwnedByMe());
        verify(likeRepository, never()).findLikedPostIds(anyLong(), anyList());
        assertThrows(SecurityException.class, () -> service.deletePost(7L));
        assertThrows(SecurityException.class, () -> service.archivePost(7L));
    }

    @Test
    void appAccountCanDeleteItsOwnPost() {
        authenticate(GLOBAL_ID, true);
        Member member = memberInThisGym(true);
        CommunityPost post = postBy(null, member);
        when(postRepository.findById(7L)).thenReturn(Optional.of(post));

        service.deletePost(7L);

        verify(postRepository).delete(post);
    }

    @Test
    void membershipRequiredIsNotASecurityExceptionSoControllerCannotMapItTo401() {
        assertFalse(SecurityException.class.isAssignableFrom(CommunityMembershipRequiredException.class));
    }

    @Test
    void memberOfAnotherGymCanLikeAndCommentButNotPost() {
        authenticate(GLOBAL_ID, true);
        when(memberRepository.findByGlobalUserId(GLOBAL_ID)).thenReturn(Optional.empty());
        when(globalMembershipService.hasActiveMembershipInAnotherGym(GLOBAL_ID)).thenReturn(true);
        when(globalMembershipService.findDisplayName(GLOBAL_ID)).thenReturn(Optional.of("Ravi Kumar"));
        CommunityPost post = postBy(user(3L), null);
        when(postRepository.findById(7L)).thenReturn(Optional.of(post));
        when(likeRepository.findByPostIdAndGlobalUserId(7L, GLOBAL_ID)).thenReturn(Optional.empty());
        feedReturns(post);
        when(likeRepository.findLikedPostIdsByGlobalUser(GLOBAL_ID, List.of(7L))).thenReturn(List.of(7L));

        var page = service.getFeed(null, null, 1, 20, false);
        assertFalse(page.isCanPost());
        assertTrue(page.isCanInteract());
        assertTrue(page.getPosts().get(0).isLikedByMe());

        assertTrue(service.toggleLike(7L).isLiked());
        ArgumentCaptor<CommunityPostLike> like = ArgumentCaptor.forClass(CommunityPostLike.class);
        verify(likeRepository).save(like.capture());
        assertEquals(GLOBAL_ID, like.getValue().getGlobalUserId());
        assertNull(like.getValue().getMember());
        assertNull(like.getValue().getUser());

        CreateCommunityCommentRequestDTO comment = new CreateCommunityCommentRequestDTO();
        comment.setContent("Great form!");
        var commentResponse = service.addComment(7L, comment);
        ArgumentCaptor<CommunityPostComment> saved = ArgumentCaptor.forClass(CommunityPostComment.class);
        verify(commentRepository).save(saved.capture());
        assertEquals(GLOBAL_ID, saved.getValue().getAuthorGlobalUserId());
        assertEquals("Ravi Kumar", saved.getValue().getAuthorDisplayName());
        assertNull(saved.getValue().getAuthorMember());
        assertNull(saved.getValue().getAuthorUser());
        assertEquals("Ravi Kumar", commentResponse.getAuthorUsername());
        assertNull(commentResponse.getAuthorMemberId());
        assertNull(commentResponse.getAuthorUserId());
        assertTrue(commentResponse.isOwnedByMe());

        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
        verify(userRepository, never()).findById(anyLong());
        verify(memberRepository, never()).findByUserId(anyLong());
    }

    @Test
    void globalAccountCommentIsOwnedOnlyByThatAccount() {
        authenticate(GLOBAL_ID, true);
        when(memberRepository.findByGlobalUserId(GLOBAL_ID)).thenReturn(Optional.empty());
        CommunityPost post = postBy(user(3L), null);
        CommunityPostComment own = new CommunityPostComment();
        own.setId(1L);
        own.setPost(post);
        own.setAuthorGlobalUserId(GLOBAL_ID);
        own.setAuthorDisplayName("Ravi Kumar");
        CommunityPostComment someoneElses = new CommunityPostComment();
        someoneElses.setId(2L);
        someoneElses.setPost(post);
        someoneElses.setAuthorGlobalUserId(GLOBAL_ID + 1);
        when(commentRepository.findByPostIdOrderByCreatedAtAsc(7L)).thenReturn(List.of(own, someoneElses));
        when(commentRepository.findById(1L)).thenReturn(Optional.of(own));
        when(commentRepository.findById(2L)).thenReturn(Optional.of(someoneElses));

        var comments = service.getComments(7L);
        assertTrue(comments.get(0).isOwnedByMe());
        assertFalse(comments.get(1).isOwnedByMe());
        assertEquals("GymBios member", comments.get(1).getAuthorUsername());

        // Deleting your own comment needs no current membership.
        service.deleteComment(7L, 1L);
        verify(commentRepository).delete(own);
        assertThrows(SecurityException.class, () -> service.deleteComment(7L, 2L));
    }

    @Test
    void lapsedMemberHereWithActiveMembershipElsewhereInteractsAsTheirMember() {
        authenticate(GLOBAL_ID, true);
        Member member = memberInThisGym(true, "expired");
        when(globalMembershipService.hasActiveMembershipInAnotherGym(GLOBAL_ID)).thenReturn(true);
        when(postRepository.findById(7L)).thenReturn(Optional.of(postBy(user(3L), null)));
        when(likeRepository.findByPostIdAndMemberId(7L, MEMBER_ID)).thenReturn(Optional.empty());
        feedReturns();

        var page = service.getFeed(null, null, 1, 20, false);
        assertFalse(page.isCanPost());
        assertTrue(page.isCanInteract());

        service.toggleLike(7L);
        ArgumentCaptor<CommunityPostLike> like = ArgumentCaptor.forClass(CommunityPostLike.class);
        verify(likeRepository).save(like.capture());
        assertSame(member, like.getValue().getMember());
        assertNull(like.getValue().getGlobalUserId());
        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
    }

    @Test
    void lapsedMembershipEverywhereIsReadOnly() {
        authenticate(GLOBAL_ID, true);
        memberInThisGym(true, "active").setExpiryDate(java.time.LocalDateTime.now().minusDays(1));
        when(globalMembershipService.hasActiveMembershipInAnotherGym(GLOBAL_ID)).thenReturn(false);
        feedReturns();

        var page = service.getFeed(null, null, 1, 20, false);
        assertFalse(page.isCanPost());
        assertFalse(page.isCanInteract());
        assertThrows(CommunityMembershipRequiredException.class, () -> service.toggleLike(7L));
        assertThrows(CommunityMembershipRequiredException.class, () -> service.createPost(postRequest()));
    }

    @Test
    void openingTheFeedIndexesTheLocalMembership() {
        authenticate(GLOBAL_ID, true);
        memberInThisGym(true);
        feedReturns();

        service.getFeed(null, null, 1, 20, false);

        verify(globalMembershipService).recordLink(GLOBAL_ID, MEMBER_ID);
    }

    @Test
    void tenantPrincipalBehaviorIsUnchanged() {
        authenticate(5L, false);
        User user = user(5L);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));

        var response = service.createPost(postRequest());

        verify(userRepository).findById(5L);
        verify(memberRepository, never()).findByGlobalUserId(anyLong());
        assertEquals(5L, response.getAuthorUserId());
        assertTrue(response.isOwnedByMe());
    }
}
