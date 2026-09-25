package com.company.project.services;

import com.company.project.dto.CreateCommunityCommentRequestDTO;
import com.company.project.dto.CreateCommunityPostRequestDTO;
import com.company.project.entities.CommunityPost;
import com.company.project.entities.User;
import com.company.project.exceptions.CommunityGlobalPrincipalNotSupportedException;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * C10 hotfix: a global principal's ID is a primary-DB users.id and must never
 * be resolved against a tenant database's users table by the legacy service.
 */
class CommunityServiceGlobalPrincipalTest {

    @Mock private CommunityPostRepository postRepository;
    @Mock private CommunityPostCommentRepository commentRepository;
    @Mock private CommunityPostLikeRepository likeRepository;
    @Mock private UserRepository userRepository;

    private CommunityService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new CommunityService(postRepository, commentRepository, likeRepository, userRepository);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(long id, boolean global) {
        UserDetailsImpl principal = new UserDetailsImpl(id, "u" + id, "u" + id + "@x", "pw", List.of(), true, global);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static CreateCommunityPostRequestDTO postRequest() {
        CreateCommunityPostRequestDTO request = new CreateCommunityPostRequestDTO();
        request.setTopic("topic");
        request.setContent("content");
        return request;
    }

    @Test
    void globalPrincipalCannotCreatePostAndTenantUsersIsNeverQueried() {
        authenticate(42L, true);
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.createPost(postRequest()));
        verify(userRepository, never()).findById(anyLong());
        verify(postRepository, never()).save(any());
    }

    @Test
    void globalPrincipalCannotCommentLikeDeleteOrArchive() {
        authenticate(42L, true);
        CreateCommunityCommentRequestDTO comment = new CreateCommunityCommentRequestDTO();
        comment.setContent("hi");

        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.addComment(1L, comment));
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.toggleLike(1L));
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.deletePost(1L));
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.deleteComment(1L, 2L));
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.archivePost(1L));
        assertThrows(CommunityGlobalPrincipalNotSupportedException.class, () -> service.unarchivePost(1L));
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void hotfixExceptionIsNotASecurityExceptionSoControllerCannotMapItTo401() {
        assertFalse(SecurityException.class.isAssignableFrom(CommunityGlobalPrincipalNotSupportedException.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void globalPrincipalFeedNeverMatchesLikesByGlobalId() {
        authenticate(42L, true);
        CommunityPost post = new CommunityPost();
        post.setId(7L);
        User author = new User();
        author.setId(3L);
        post.setAuthorUser(author);
        when(postRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(post)));

        var page = service.getFeed(null, null, 1, 20, false);

        assertFalse(page.getPosts().get(0).isLikedByMe());
        verify(likeRepository, never()).findLikedPostIds(anyLong(), anyList());
    }

    @Test
    void tenantPrincipalBehaviorIsUnchanged() {
        authenticate(5L, false);
        User user = new User();
        user.setId(5L);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(postRepository.save(any(CommunityPost.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.createPost(postRequest());

        verify(userRepository).findById(5L);
        assertEquals(5L, response.getAuthorUserId());
    }
}
