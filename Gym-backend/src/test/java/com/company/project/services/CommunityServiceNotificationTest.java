package com.company.project.services;

import com.company.project.dto.CreateCommunityCommentRequestDTO;
import com.company.project.entities.CommunityPost;
import com.company.project.entities.CommunityPostComment;
import com.company.project.entities.CommunityPostLike;
import com.company.project.entities.User;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Likes and comments on a post notify its author — never the actor themselves. */
class CommunityServiceNotificationTest {

    private static final long AUTHOR_ID = 3L;
    private static final long OTHER_ID = 5L;
    private static final long POST_ID = 7L;

    @Mock private CommunityPostRepository postRepository;
    @Mock private CommunityPostCommentRepository commentRepository;
    @Mock private CommunityPostLikeRepository likeRepository;
    @Mock private UserRepository userRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private NotificationService notificationService;

    private CommunityService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new CommunityService(postRepository, commentRepository, likeRepository, userRepository, memberRepository, notificationService,
                mock(GlobalMembershipService.class));

        CommunityPost post = new CommunityPost();
        post.setId(POST_ID);
        post.setTopic("Leg day PR");
        post.setAuthorUser(user(AUTHOR_ID));
        when(postRepository.findById(POST_ID)).thenReturn(Optional.of(post));
        when(userRepository.findById(AUTHOR_ID)).thenReturn(Optional.of(post.getAuthorUser()));
        when(userRepository.findById(OTHER_ID)).thenReturn(Optional.of(user(OTHER_ID)));
        when(commentRepository.save(any(CommunityPostComment.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void likingSomeoneElsesPostNotifiesTheAuthorOncePerLiker() {
        authenticate(OTHER_ID);
        when(likeRepository.findByPostIdAndUserId(POST_ID, OTHER_ID)).thenReturn(Optional.empty());

        service.toggleLike(POST_ID);

        verify(notificationService).notifyUser(
                eq(AUTHOR_ID), anyString(), contains("user5 liked your post \"Leg day PR\""),
                anyString(), anyString(), eq(CommunityService.NOTIFICATION_MODULE),
                eq(POST_ID), eq("/community"), eq("COMMUNITY_LIKE_" + POST_ID + "_" + OTHER_ID));
    }

    @Test
    void unlikingDoesNotNotify() {
        authenticate(OTHER_ID);
        when(likeRepository.findByPostIdAndUserId(POST_ID, OTHER_ID))
                .thenReturn(Optional.of(new CommunityPostLike()));

        service.toggleLike(POST_ID);

        verifyNoNotification();
    }

    @Test
    void commentingOnSomeoneElsesPostNotifiesTheAuthor() {
        authenticate(OTHER_ID);

        service.addComment(POST_ID, comment("Nice work!"));

        verify(notificationService).notifyUser(
                eq(AUTHOR_ID), anyString(), contains("user5 commented: \"Nice work!\""),
                anyString(), anyString(), eq(CommunityService.NOTIFICATION_MODULE),
                eq(POST_ID), eq("/community"), isNull());
    }

    @Test
    void activityOnYourOwnPostDoesNotNotifyYou() {
        authenticate(AUTHOR_ID);
        when(likeRepository.findByPostIdAndUserId(POST_ID, AUTHOR_ID)).thenReturn(Optional.empty());

        service.toggleLike(POST_ID);
        service.addComment(POST_ID, comment("Thanks all"));

        verifyNoNotification();
    }

    private void verifyNoNotification() {
        verify(notificationService, never()).notifyUser(
                anyLong(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("user" + id);
        return user;
    }

    private static CreateCommunityCommentRequestDTO comment(String content) {
        CreateCommunityCommentRequestDTO request = new CreateCommunityCommentRequestDTO();
        request.setContent(content);
        return request;
    }

    private void authenticate(long id) {
        UserDetailsImpl principal = new UserDetailsImpl(id, "user" + id, "u" + id + "@x", "pw", List.of(), true, false);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
