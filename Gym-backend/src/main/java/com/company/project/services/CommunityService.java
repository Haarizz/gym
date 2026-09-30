package com.company.project.services;

import com.company.project.dto.*;
import com.company.project.entities.*;
import com.company.project.exceptions.CommunityMembershipRequiredException;
import com.company.project.repositories.CommunityPostCommentRepository;
import com.company.project.repositories.CommunityPostLikeRepository;
import com.company.project.repositories.CommunityPostRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.TenantContextHolder;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CommunityService {

    /**
     * Notification module for activity on a user's own posts. Deliberately NOT the
     * "COMMUNITY" permission-catalog module: NotificationService hides catalog modules
     * from roles without a matching permission, and members/trainers — who can post —
     * hold no COMMUNITY_* permissions, so they'd never see likes/comments on their posts.
     */
    public static final String NOTIFICATION_MODULE = "COMMUNITY_ACTIVITY";
    private static final String NOTIFICATION_ACTION_URL = "/community";
    private static final int NOTIFICATION_SNIPPET_LENGTH = 80;

    private final CommunityPostRepository communityPostRepository;
    private final CommunityPostCommentRepository communityPostCommentRepository;
    private final CommunityPostLikeRepository communityPostLikeRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    public CommunityService(
            CommunityPostRepository communityPostRepository,
            CommunityPostCommentRepository communityPostCommentRepository,
            CommunityPostLikeRepository communityPostLikeRepository,
            UserRepository userRepository,
            MemberRepository memberRepository,
            NotificationService notificationService
    ) {
        this.communityPostRepository = communityPostRepository;
        this.communityPostCommentRepository = communityPostCommentRepository;
        this.communityPostLikeRepository = communityPostLikeRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
    }

    /**
     * Identity of the caller as a community participant. Tenant logins (staff and
     * gym-issued member credentials) act as their tenant User; GymBios app accounts
     * have no tenant users row and act as the Member their membership purchase
     * created in this gym. At most one of userId / memberId is set.
     */
    private record Viewer(Long userId, Long memberId, boolean canPost) {
        static final Viewer ANONYMOUS = new Viewer(null, null, false);

        boolean isAuthorOf(User authorUser, Member authorMember) {
            if (userId != null) {
                return authorUser != null && userId.equals(authorUser.getId());
            }
            if (memberId != null) {
                return authorMember != null && memberId.equals(authorMember.getId());
            }
            return false;
        }
    }

    /** A caller allowed to write; exactly one of user / member is set. */
    private record Actor(User user, Member member) {
        Viewer viewer() {
            return user != null
                    ? new Viewer(user.getId(), null, true)
                    : new Viewer(null, member.getId(), true);
        }

        String displayName() {
            return user != null ? user.getUsername() : member.getName();
        }

        /** Distinct across both ID spaces, for notification dedup keys. */
        String key() {
            return user != null ? String.valueOf(user.getId()) : "m" + member.getId();
        }
    }

    public CommunityPostsPageResponseDTO getFeed(String q, String type, int page, int limit, Boolean archived) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safePage = Math.max(page, 1);
        Pageable pageable = PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        String normalizedQ = (q == null || q.trim().isEmpty()) ? null : q.trim();
        String normalizedType = (type == null || type.trim().isEmpty() || type.equalsIgnoreCase("all"))
                ? null
                : type.trim();
        boolean archivedOnly = Boolean.TRUE.equals(archived);

        Specification<CommunityPost> spec = null;

        if (archivedOnly) {
            // Archived posts are never public. Allow only the owner (or admin) to view archived items.
            Actor actor = getCurrentActorOrThrow();
            boolean admin = isAdmin(actor);

            spec = Specification.where((root, query, cb) -> cb.isTrue(root.get("archived")));
            if (!admin) {
                spec = actor.user() != null
                        ? spec.and((root, query, cb) -> cb.equal(root.get("authorUser").get("id"), actor.user().getId()))
                        : spec.and((root, query, cb) -> cb.equal(root.get("authorMember").get("id"), actor.member().getId()));
            }
        } else {
            // Treat NULL as false for rows created before this flag existed.
            spec = Specification.where((root, query, cb) -> cb.or(
                    cb.isFalse(root.get("archived")),
                    cb.isNull(root.get("archived"))
            ));
        }

        if (normalizedType != null) {
            String match = normalizedType.toLowerCase(Locale.ROOT);
            Specification<CommunityPost> typeSpec = (root, query, cb) -> cb.equal(cb.lower(root.get("type")), match);
            spec = (spec == null) ? Specification.where(typeSpec) : spec.and(typeSpec);
        }
        if (normalizedQ != null) {
            String like = "%" + normalizedQ.toLowerCase(Locale.ROOT) + "%";
            Specification<CommunityPost> qSpec = (root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("topic")), like),
                    cb.like(cb.lower(root.get("content")), like)
            );
            spec = (spec == null) ? Specification.where(qSpec) : spec.and(qSpec);
        }

        Page<CommunityPost> result = communityPostRepository.findAll(spec, pageable);

        Viewer viewer = getCurrentViewer();
        final Set<Long> likedByMeSet;
        if (result.getContent().isEmpty()) {
            likedByMeSet = Collections.emptySet();
        } else if (viewer.userId() != null) {
            List<Long> ids = result.getContent().stream().map(CommunityPost::getId).toList();
            likedByMeSet = new HashSet<>(communityPostLikeRepository.findLikedPostIds(viewer.userId(), ids));
        } else if (viewer.memberId() != null) {
            List<Long> ids = result.getContent().stream().map(CommunityPost::getId).toList();
            likedByMeSet = new HashSet<>(communityPostLikeRepository.findLikedPostIdsByMember(viewer.memberId(), ids));
        } else {
            likedByMeSet = Collections.emptySet();
        }

        List<CommunityPostResponseDTO> posts = result.getContent().stream()
                .map(post -> toPostResponse(post, likedByMeSet.contains(post.getId()), viewer))
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                safePage,
                safeLimit,
                result.getTotalElements(),
                result.getTotalPages()
        );

        CommunityPostsPageResponseDTO response = new CommunityPostsPageResponseDTO(posts, pagination);
        response.setCanPost(viewer.canPost());
        return response;
    }

    @Transactional
    public CommunityPostResponseDTO createPost(CreateCommunityPostRequestDTO request) {
        Actor author = getCurrentActorOrThrow();

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
        post.setAuthorUser(author.user());
        post.setAuthorMember(author.member());
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
        return toPostResponse(saved, false, author.viewer());
    }

    /**
     * Real engagement metrics for the analytics dashboard — no invented "features"
     * like challenges/leaderboards/chat, since none of those exist as trackable
     * entities. Grounded in the actual post type (achievement/question/tip) and
     * the like/comment counters already maintained on each post.
     */
    @Transactional(readOnly = true)
    public CommunityEngagementStatsDTO getEngagementStats() {
        List<CommunityPost> posts = communityPostRepository.findAll().stream()
                .filter(p -> !p.isArchived())
                .collect(Collectors.toList());

        long totalPosts = posts.size();
        long totalLikes = posts.stream().mapToLong(CommunityPost::getLikeCount).sum();
        long totalComments = posts.stream().mapToLong(CommunityPost::getCommentCount).sum();

        Map<String, long[]> byTypeAgg = new LinkedHashMap<>();
        for (CommunityPost p : posts) {
            String type = p.getType() != null && !p.getType().isBlank() ? p.getType() : "other";
            long[] agg = byTypeAgg.computeIfAbsent(type, k -> new long[3]);
            agg[0]++;
            agg[1] += p.getLikeCount();
            agg[2] += p.getCommentCount();
        }
        List<CommunityEngagementStatsDTO.TypeBreakdown> byType = byTypeAgg.entrySet().stream()
                .map(e -> new CommunityEngagementStatsDTO.TypeBreakdown(
                        e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .sorted(Comparator.comparingLong(CommunityEngagementStatsDTO.TypeBreakdown::getPosts).reversed())
                .collect(Collectors.toList());

        // Weekly activity for the last 8 ISO weeks (Monday-start buckets)
        int weekCount = 8;
        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        List<LocalDate> weekStarts = new ArrayList<>();
        for (int i = weekCount - 1; i >= 0; i--) {
            weekStarts.add(currentWeekStart.minusWeeks(i));
        }
        Map<LocalDate, long[]> weeklyAgg = new LinkedHashMap<>();
        for (LocalDate ws : weekStarts) weeklyAgg.put(ws, new long[3]);

        for (CommunityPost p : posts) {
            if (p.getCreatedAt() == null) continue;
            LocalDate postWeekStart = p.getCreatedAt().toLocalDate().with(DayOfWeek.MONDAY);
            long[] agg = weeklyAgg.get(postWeekStart);
            if (agg == null) continue;
            agg[0]++;
            agg[1] += p.getLikeCount();
            agg[2] += p.getCommentCount();
        }

        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("MMM d");
        List<CommunityEngagementStatsDTO.WeeklyPoint> weekly = weekStarts.stream()
                .map(ws -> {
                    long[] agg = weeklyAgg.get(ws);
                    return new CommunityEngagementStatsDTO.WeeklyPoint(ws.format(labelFmt), agg[0], agg[1], agg[2]);
                })
                .collect(Collectors.toList());

        CommunityEngagementStatsDTO dto = new CommunityEngagementStatsDTO();
        dto.setTotalPosts(totalPosts);
        dto.setTotalLikes(totalLikes);
        dto.setTotalComments(totalComments);
        dto.setByType(byType);
        dto.setWeekly(weekly);
        return dto;
    }

    /**
     * Trending topics — aggregates non-archived posts from the last 30 days,
     * groups by topic, counts posts per topic, returns top 10.
     */
    @Transactional(readOnly = true)
    public List<TrendingTopicDTO> getTrendingTopics() {
        LocalDate cutoff = LocalDate.now().minusDays(30);
        List<CommunityPost> recentPosts = communityPostRepository.findAll().stream()
                .filter(p -> !p.isArchived())
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().toLocalDate().isBefore(cutoff))
                .collect(Collectors.toList());

        Map<String, Integer> topicCounts = new LinkedHashMap<>();
        for (CommunityPost p : recentPosts) {
            String topic = p.getTopic();
            if (topic == null || topic.isBlank()) continue;
            topicCounts.merge(topic.trim(), 1, Integer::sum);
        }

        return topicCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> new TrendingTopicDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    /**
     * Leaderboard — aggregates all non-archived posts by author, sums likes +
     * comments as an engagement score, returns top 10 users.
     */
    @Transactional(readOnly = true)
    public List<LeaderboardEntryDTO> getLeaderboard() {
        List<CommunityPost> posts = communityPostRepository.findAll().stream()
                .filter(p -> !p.isArchived())
                .collect(Collectors.toList());

        // Authors are users or members (separate ID spaces), so key by "u<id>" / "m<id>".
        // key → author identity; key → [postCount, totalLikes, totalComments]
        Map<String, LeaderboardEntryDTO> authors = new LinkedHashMap<>();
        Map<String, long[]> agg = new LinkedHashMap<>();

        for (CommunityPost p : posts) {
            String key;
            if (p.getAuthorUser() != null && p.getAuthorUser().getId() != null) {
                User author = p.getAuthorUser();
                key = "u" + author.getId();
                authors.computeIfAbsent(key, k -> {
                    LeaderboardEntryDTO entry = new LeaderboardEntryDTO();
                    entry.setUserId(author.getId());
                    entry.setUsername(author.getUsername());
                    return entry;
                });
            } else if (p.getAuthorMember() != null && p.getAuthorMember().getId() != null) {
                Member author = p.getAuthorMember();
                key = "m" + author.getId();
                authors.computeIfAbsent(key, k -> {
                    LeaderboardEntryDTO entry = new LeaderboardEntryDTO();
                    entry.setMemberId(author.getId());
                    entry.setUsername(author.getName());
                    return entry;
                });
            } else {
                continue;
            }
            long[] counts = agg.computeIfAbsent(key, k -> new long[3]);
            counts[0]++;
            counts[1] += p.getLikeCount();
            counts[2] += p.getCommentCount();
        }

        return agg.entrySet().stream()
                .map(e -> {
                    LeaderboardEntryDTO author = authors.get(e.getKey());
                    LeaderboardEntryDTO entry = new LeaderboardEntryDTO(
                            author.getUserId(),
                            author.getUsername() != null ? author.getUsername() : "Unknown",
                            (int) e.getValue()[0],
                            e.getValue()[1],
                            e.getValue()[2]);
                    entry.setMemberId(author.getMemberId());
                    return entry;
                })
                .sorted(Comparator.comparingLong(LeaderboardEntryDTO::getEngagementScore).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    public List<CommunityPostCommentResponseDTO> getComments(Long postId) {
        List<CommunityPostComment> comments = communityPostCommentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        Viewer viewer = getCurrentViewer();
        return comments.stream().map(comment -> toCommentResponse(comment, viewer)).collect(Collectors.toList());
    }

    @Transactional
    public CommunityPostCommentResponseDTO addComment(Long postId, CreateCommunityCommentRequestDTO request) {
        Actor author = getCurrentActorOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        String content = Optional.ofNullable(request.getContent()).orElse("").trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Comment content is required");
        }

        CommunityPostComment comment = new CommunityPostComment();
        comment.setPost(post);
        comment.setAuthorUser(author.user());
        comment.setAuthorMember(author.member());
        comment.setContent(content);
        CommunityPostComment saved = communityPostCommentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
        communityPostRepository.save(post);

        notifyPostAuthor(post, author,
                "New comment on your post",
                author.displayName() + " commented: \"" + snippet(content) + "\"",
                null);

        return toCommentResponse(saved, author.viewer());
    }

    @Transactional
    public ToggleCommunityLikeResponseDTO toggleLike(Long postId) {
        Actor actor = getCurrentActorOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        Optional<CommunityPostLike> existing = actor.user() != null
                ? communityPostLikeRepository.findByPostIdAndUserId(postId, actor.user().getId())
                : communityPostLikeRepository.findByPostIdAndMemberId(postId, actor.member().getId());
        if (existing.isPresent()) {
            communityPostLikeRepository.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            communityPostRepository.save(post);
            return new ToggleCommunityLikeResponseDTO(false, post.getLikeCount());
        }

        communityPostLikeRepository.save(actor.user() != null
                ? new CommunityPostLike(post, actor.user())
                : new CommunityPostLike(post, actor.member()));
        post.setLikeCount(post.getLikeCount() + 1);
        communityPostRepository.save(post);

        // Keyed per (post, liker) so unlike → like again doesn't re-notify the author.
        notifyPostAuthor(post, actor,
                "New like on your post",
                actor.displayName() + " liked your post \"" + snippet(post.getTopic()) + "\"",
                "COMMUNITY_LIKE_" + post.getId() + "_" + actor.key());

        return new ToggleCommunityLikeResponseDTO(true, post.getLikeCount());
    }

    /**
     * Notify a post's author about someone else's activity on it; never about their own.
     * In-app notifications are addressed to tenant users, so posts authored by an app
     * account's Member get none.
     */
    private void notifyPostAuthor(CommunityPost post, Actor actor, String title, String message, String eventKey) {
        User postAuthor = post.getAuthorUser();
        if (postAuthor == null || actor.viewer().isAuthorOf(postAuthor, null)) {
            return;
        }
        notificationService.notifyUser(
                postAuthor.getId(), title, message,
                "INFO", "LOW", NOTIFICATION_MODULE,
                post.getId(), NOTIFICATION_ACTION_URL, eventKey
        );
    }

    private static String snippet(String text) {
        String trimmed = text == null ? "" : text.trim();
        return trimmed.length() <= NOTIFICATION_SNIPPET_LENGTH
                ? trimmed
                : trimmed.substring(0, NOTIFICATION_SNIPPET_LENGTH - 1) + "…";
    }

    @Transactional
    public void deletePost(Long postId) {
        Actor actor = getCurrentActorOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        boolean isOwner = actor.viewer().isAuthorOf(post.getAuthorUser(), post.getAuthorMember());
        if (!isOwner && !isAdmin(actor)) {
            throw new SecurityException("Not allowed to delete this post");
        }

        communityPostLikeRepository.deleteByPostId(postId);
        communityPostLikeRepository.flush();

        communityPostCommentRepository.deleteByPostId(postId);
        communityPostCommentRepository.flush();

        communityPostRepository.delete(post);
        communityPostRepository.flush();
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId) {
        Actor actor = getCurrentActorOrThrow();
        CommunityPostComment comment = communityPostCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (comment.getPost() == null || comment.getPost().getId() == null || !comment.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Comment not found");
        }

        boolean isOwner = actor.viewer().isAuthorOf(comment.getAuthorUser(), comment.getAuthorMember());
        if (!isOwner && !isAdmin(actor)) {
            throw new SecurityException("Not allowed to delete this comment");
        }

        CommunityPost post = comment.getPost();
        communityPostCommentRepository.delete(comment);

        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        communityPostRepository.save(post);
    }

    /**
     * GYMBIOS_ADMIN (platform owner) is scoped to Gym Management only — it doesn't
     * moderate community content for any gym, so this override is permanently off.
     * Left in place (rather than removed) as the hook for a future gym-scoped
     * moderator role, if one is ever needed.
     */
    private boolean isAdmin(Actor actor) {
        return false;
    }

    private UserDetailsImpl getCurrentPrincipalOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        return authentication.getPrincipal() instanceof UserDetailsImpl userDetails ? userDetails : null;
    }

    /**
     * The caller as a participant allowed to post, comment and like. App accounts
     * qualify only once they hold a membership in this gym whose app access isn't
     * held back pending payment approval; until then they can only read the feed.
     */
    private Actor getCurrentActorOrThrow() {
        UserDetailsImpl userDetails = getCurrentPrincipalOrNull();
        if (userDetails == null) {
            throw new SecurityException("Not authenticated");
        }

        if (!userDetails.isGlobal()) {
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new SecurityException("User not found"));
            return new Actor(user, null);
        }

        Member member = findAppAccountMember(userDetails.getId())
                .orElseThrow(() -> new CommunityMembershipRequiredException(
                        "Purchase a membership at this gym to post, comment and like in its community."));
        if (Boolean.FALSE.equals(member.getAppAccessEnabled())) {
            throw new CommunityMembershipRequiredException(
                    "You can post in the community once the gym approves your membership payment.");
        }
        return new Actor(null, member);
    }

    /** Like getCurrentActorOrThrow, but for read paths: never throws, and resolves no User row. */
    private Viewer getCurrentViewer() {
        UserDetailsImpl userDetails = getCurrentPrincipalOrNull();
        if (userDetails == null) {
            return Viewer.ANONYMOUS;
        }
        if (!userDetails.isGlobal()) {
            return new Viewer(userDetails.getId(), null, true);
        }
        return findAppAccountMember(userDetails.getId())
                .map(member -> new Viewer(null, member.getId(), !Boolean.FALSE.equals(member.getAppAccessEnabled())))
                .orElse(Viewer.ANONYMOUS);
    }

    /**
     * An app account's ID is a primary-DB users.id, so it is only ever matched against
     * members.global_user_id — never against tenant users.id or members.user_id, where
     * it could collide with an unrelated tenant user's ID (unlike the mobile services,
     * there is deliberately no findByUserId fallback here).
     */
    private Optional<Member> findAppAccountMember(Long globalUserId) {
        // No gym selected (e.g. a fresh app account browsing before joining one):
        // there is no membership to find, and the lookup must not hit the default DB.
        if (TenantContextHolder.getCurrentTenant() == null) {
            return Optional.empty();
        }
        return memberRepository.findByGlobalUserId(globalUserId);
    }

    private CommunityPostResponseDTO toPostResponse(CommunityPost post, boolean likedByMe, Viewer viewer) {

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
        if (post.getAuthorUser() != null) {
            User author = post.getAuthorUser();
            dto.setAuthorUserId(author.getId());
            dto.setAuthorUsername(author.getUsername());
            dto.setAuthorRoles(rolesOf(author));
        } else if (post.getAuthorMember() != null) {
            Member author = post.getAuthorMember();
            dto.setAuthorMemberId(author.getId());
            dto.setAuthorUsername(author.getName());
            dto.setAuthorRoles(List.of("MEMBER"));
        }
        dto.setOwnedByMe(viewer.isAuthorOf(post.getAuthorUser(), post.getAuthorMember()));
        dto.setCreatedAt(post.getCreatedAt());
        dto.setArchived(post.isArchived());
        return dto;
    }

    @Transactional
    public CommunityPostResponseDTO archivePost(Long postId) {
        return setArchived(postId, true);
    }

    @Transactional
    public CommunityPostResponseDTO unarchivePost(Long postId) {
        return setArchived(postId, false);
    }

    private CommunityPostResponseDTO setArchived(Long postId, boolean archived) {
        Actor actor = getCurrentActorOrThrow();
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        boolean isOwner = actor.viewer().isAuthorOf(post.getAuthorUser(), post.getAuthorMember());
        if (!isOwner && !isAdmin(actor)) {
            throw new SecurityException("Not allowed to update this post");
        }

        post.setArchived(archived);
        CommunityPost saved = communityPostRepository.save(post);
        return toPostResponse(saved, false, actor.viewer());
    }

    private CommunityPostCommentResponseDTO toCommentResponse(CommunityPostComment comment, Viewer viewer) {
        CommunityPostCommentResponseDTO dto = new CommunityPostCommentResponseDTO();
        dto.setId(comment.getId());
        dto.setPostId(comment.getPost().getId());
        dto.setContent(comment.getContent());
        if (comment.getAuthorUser() != null) {
            User author = comment.getAuthorUser();
            dto.setAuthorUserId(author.getId());
            dto.setAuthorUsername(author.getUsername());
            dto.setAuthorRoles(rolesOf(author));
        } else if (comment.getAuthorMember() != null) {
            Member author = comment.getAuthorMember();
            dto.setAuthorMemberId(author.getId());
            dto.setAuthorUsername(author.getName());
            dto.setAuthorRoles(List.of("MEMBER"));
        }
        dto.setOwnedByMe(viewer.isAuthorOf(comment.getAuthorUser(), comment.getAuthorMember()));
        dto.setCreatedAt(comment.getCreatedAt());
        return dto;
    }

    private static List<String> rolesOf(User user) {
        return user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getRoleName())
                .distinct()
                .collect(Collectors.toList());
    }
}
