package com.company.project.services;

import com.company.project.dto.*;
import com.company.project.entities.*;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CommunityService {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityPostCommentRepository communityPostCommentRepository;
    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final UserRepository userRepository;

    public CommunityService(
            CommunityPostRepository communityPostRepository,
            CommunityPostCommentRepository communityPostCommentRepository,
            CommunityPostLikeRepository communityPostLikeRepository,
            UserRepository userRepository
    ) {
        this.communityPostRepository = communityPostRepository;
        this.communityPostCommentRepository = communityPostCommentRepository;
        this.communityPostLikeRepository = communityPostLikeRepository;
        this.userRepository = userRepository;
    }

    public CommunityPostsPageResponseDTO getFeed(String q, String type, int page, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safePage = Math.max(page, 1);
        Pageable pageable = PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalizedQ = (q == null || q.trim().isEmpty()) ? null : q.trim();
        String normalizedType = (type == null || type.trim().isEmpty() || type.equalsIgnoreCase("all"))
                ? null
                : type.trim();

        Specification<CommunityPost> spec = null;
        if (normalizedType != null) {
            String match = normalizedType.toLowerCase(Locale.ROOT);
            spec = Specification.where((root, query, cb) -> cb.equal(cb.lower(root.get("type")), match));
        }
        if (normalizedQ != null) {
            String like = "%" + normalizedQ.toLowerCase(Locale.ROOT) + "%";
            Specification<CommunityPost> qSpec = (root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("topic")), like),
                    cb.like(cb.lower(root.get("content")), like)
            );
            spec = (spec == null) ? Specification.where(qSpec) : spec.and(qSpec);
        }

        Page<CommunityPost> result = (spec == null)
                ? communityPostRepository.findAll(pageable)
                : communityPostRepository.findAll(spec, pageable);

        Long currentUserId = getCurrentUserIdOrNull();
        final Set<Long> likedByMeSet;
        if (currentUserId != null && !result.getContent().isEmpty()) {
            List<Long> ids = result.getContent().stream().map(CommunityPost::getId).toList();
            likedByMeSet = new HashSet<>(communityPostLikeRepository.findLikedPostIds(currentUserId, ids));
        } else {
            likedByMeSet = Collections.emptySet();
        }

        List<CommunityPostResponseDTO> posts = result.getContent().stream()
                .map(post -> toPostResponse(post, likedByMeSet.contains(post.getId())))
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                safePage,
                safeLimit,
                result.getTotalElements(),
                result.getTotalPages()
        );

        return new CommunityPostsPageResponseDTO(posts, pagination);
    }

    @Transactional
    public CommunityPostResponseDTO createPost(CreateCommunityPostRequestDTO request) {
        User author = getCurrentUserOrThrow();

        String topic = Optional.ofNullable(request.getTopic()).orElse("").trim();
        String content = Optional.ofNullable(request.getContent()).orElse("").trim();
        String type = Optional.ofNullable(request.getType()).orElse("achievement").trim().toLowerCase(Locale.ROOT);

        if (topic.isEmpty()) {
            throw new IllegalArgumentException("Topic is required");
        }
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Content is required");
        }

        CommunityPost post = new CommunityPost();
        post.setAuthorUser(author);
        post.setTopic(topic);
        post.setContent(content);
        post.setType(type);

        if (request.getImageDataUrl() != null && !request.getImageDataUrl().trim().isEmpty()) {
            post.setImageDataUrl(request.getImageDataUrl().trim());
            post.setImageAspectRatio(request.getImageAspectRatio());
            post.setImageCropPosition(request.getImageCropPosition());
            post.setImageCropZoom(request.getImageCropZoom());
        }

        CommunityPost saved = communityPostRepository.save(post);
        return toPostResponse(saved, false);
    }

    public List<CommunityPostCommentResponseDTO> getComments(Long postId) {
        List<CommunityPostComment> comments = communityPostCommentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        return comments.stream().map(this::toCommentResponse).collect(Collectors.toList());
    }

    @Transactional
    public CommunityPostCommentResponseDTO addComment(Long postId, CreateCommunityCommentRequestDTO request) {
        User author = getCurrentUserOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        String content = Optional.ofNullable(request.getContent()).orElse("").trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Comment content is required");
        }

        CommunityPostComment comment = new CommunityPostComment();
        comment.setPost(post);
        comment.setAuthorUser(author);
        comment.setContent(content);
        CommunityPostComment saved = communityPostCommentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
        communityPostRepository.save(post);

        return toCommentResponse(saved);
    }

    @Transactional
    public ToggleCommunityLikeResponseDTO toggleLike(Long postId) {
        User user = getCurrentUserOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Optional<CommunityPostLike> existing = communityPostLikeRepository.findByPostIdAndUserId(postId, user.getId());
        if (existing.isPresent()) {
            communityPostLikeRepository.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            communityPostRepository.save(post);
            return new ToggleCommunityLikeResponseDTO(false, post.getLikeCount());
        }

        communityPostLikeRepository.save(new CommunityPostLike(post, user));
        post.setLikeCount(post.getLikeCount() + 1);
        communityPostRepository.save(post);
        return new ToggleCommunityLikeResponseDTO(true, post.getLikeCount());
    }

    private User getCurrentUserOrThrow() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new SecurityException("Not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl userDetails)) {
            throw new SecurityException("Not authenticated");
        }

        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new SecurityException("User not found"));
    }

    private Long getCurrentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl userDetails)) {
            return null;
        }

        return userDetails.getId();
    }

    private CommunityPostResponseDTO toPostResponse(CommunityPost post, boolean likedByMe) {
        User author = post.getAuthorUser();
        List<String> roles = author.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getRoleName())
                .distinct()
                .collect(Collectors.toList());

        CommunityPostImageDTO image = null;
        if (post.getImageDataUrl() != null && !post.getImageDataUrl().isEmpty()) {
            image = new CommunityPostImageDTO(
                    post.getImageDataUrl(),
                    post.getImageAspectRatio(),
                    post.getImageCropPosition(),
                    post.getImageCropZoom()
            );
        }

        CommunityPostResponseDTO dto = new CommunityPostResponseDTO();
        dto.setId(post.getId());
        dto.setTopic(post.getTopic());
        dto.setContent(post.getContent());
        dto.setType(post.getType());
        dto.setLikeCount(post.getLikeCount());
        dto.setCommentCount(post.getCommentCount());
        dto.setLikedByMe(likedByMe);
        dto.setImage(image);
        dto.setAuthorUserId(author.getId());
        dto.setAuthorUsername(author.getUsername());
        dto.setAuthorRoles(roles);
        dto.setCreatedAt(post.getCreatedAt());
        return dto;
    }

    private CommunityPostCommentResponseDTO toCommentResponse(CommunityPostComment comment) {
        User author = comment.getAuthorUser();
        List<String> roles = author.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getRoleName())
                .distinct()
                .collect(Collectors.toList());

        CommunityPostCommentResponseDTO dto = new CommunityPostCommentResponseDTO();
        dto.setId(comment.getId());
        dto.setPostId(comment.getPost().getId());
        dto.setContent(comment.getContent());
        dto.setAuthorUserId(author.getId());
        dto.setAuthorUsername(author.getUsername());
        dto.setAuthorRoles(roles);
        dto.setCreatedAt(comment.getCreatedAt());
        return dto;
    }
}
