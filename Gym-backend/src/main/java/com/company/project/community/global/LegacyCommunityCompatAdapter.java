package com.company.project.community.global;

import com.company.project.community.global.GlobalCommunityService.Request;
import com.company.project.community.global.identity.CommunityActor;
import com.company.project.community.global.identity.CommunityActorResolver;
import com.company.project.community.global.identity.CommunityGymContextResolver;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.community.global.policy.CommunityModerationPolicy;
import com.company.project.community.global.policy.CommunityModerationPolicy.Viewer;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.community.global.rollout.CommunityRolloutService.Surface;
import com.company.project.controlplane.community.store.CommunityAuthorStore;
import com.company.project.controlplane.community.store.CommunityAuthorStore.AuthorRow;
import com.company.project.controlplane.community.store.CommunityDb;
import com.company.project.controlplane.community.store.CommunityInteractionStore;
import com.company.project.controlplane.community.store.CommunityInteractionStore.CommentRow;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityPostStore.PostRow;
import com.company.project.dto.CommunityEngagementStatsDTO;
import com.company.project.dto.CommunityPostCommentResponseDTO;
import com.company.project.dto.CommunityPostImageDTO;
import com.company.project.dto.CommunityPostResponseDTO;
import com.company.project.dto.CommunityPostsPageResponseDTO;
import com.company.project.dto.CreateCommunityCommentRequestDTO;
import com.company.project.dto.CreateCommunityPostRequestDTO;
import com.company.project.dto.LeaderboardEntryDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ToggleCommunityLikeResponseDTO;
import com.company.project.dto.TrendingTopicDTO;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import com.company.project.security.BranchContextHolder;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serves the old tenant-scoped /api/community endpoints from the global store
 * once authority is GLOBAL, so old clients write to the one authoritative
 * store. See docs/community/phase5-adapter-contract.md for the endpoint map
 * and every intended behavior difference.
 *
 * - Same DTO classes as the legacy service → identical response shapes.
 * - Same scope as before: one gym (and the active branch, if any). Old clients
 *   never see the global feed.
 * - Identity, visibility and permissions go through the same actor resolver,
 *   policy and GlobalCommunityService write paths as the new API.
 * - Errors are translated back to the legacy controller's exception types
 *   (IllegalArgumentException / SecurityException) and messages.
 */
@Service
public class LegacyCommunityCompatAdapter {

    private static final long GLOBAL_ID_START = 1_000_000_000L;
    private static final String MISSING_TABLE = "42P01";

    private final CommunityRolloutService rollout;
    private final CommunityActorResolver actors;
    private final CommunityGymContextResolver gymContexts;
    private final TenantDataSources tenantDataSources;
    private final GlobalCommunityService community;
    private final CommunityAuthorStore authors;
    private final CommunityPostStore posts;
    private final CommunityInteractionStore interactions;
    private final CommunityDb db;

    /** Once GLOBAL has been observed, this process never serves the legacy tables again. */
    private volatile boolean globalObserved;

    public LegacyCommunityCompatAdapter(CommunityRolloutService rollout, CommunityActorResolver actors,
                                        CommunityGymContextResolver gymContexts, TenantDataSources tenantDataSources,
                                        GlobalCommunityService community, CommunityAuthorStore authors,
                                        CommunityPostStore posts, CommunityInteractionStore interactions, CommunityDb db) {
        this.rollout = rollout;
        this.actors = actors;
        this.gymContexts = gymContexts;
        this.tenantDataSources = tenantDataSources;
        this.community = community;
        this.authors = authors;
        this.posts = posts;
        this.interactions = interactions;
        this.db = db;
    }

    /**
     * Whether the old endpoints must be served from the global store. Fails
     * closed: only a control plane without the V6 tables (not deployed yet)
     * means "legacy"; any other failure to read the state is an error, never a
     * silent fall-back that could split writes across two stores.
     */
    public boolean isActive() {
        if (globalObserved) {
            return true;
        }
        try {
            boolean global = rollout.state().isGlobalAuthority();
            if (global) {
                globalObserved = true;
            }
            return global;
        } catch (DataAccessException e) {
            if (e.getMostSpecificCause() instanceof SQLException sql && MISSING_TABLE.equals(sql.getSQLState())) {
                return false;
            }
            throw CommunityException.unavailable("COMMUNITY_STATE_UNAVAILABLE", "The Community is temporarily unavailable");
        }
    }

    // ── Scope ───────────────────────────────────────────────────────────────

    private record Scope(CommunityActor actor, String gym, Long branchId, Request request) {}

    private Scope scope() {
        CommunityActor actor = actors.current();
        String header = selectedGymHeader();
        String gym = switch (actor.kind()) {
            case TENANT -> {
                if (actor.tenantSlug() == null) {
                    throw CommunityException.forbidden("MISSING_TENANT_CONTEXT", "Your session doesn't identify a gym");
                }
                yield actor.tenantSlug();
            }
            case GLOBAL -> {
                if (header == null || !gymContexts.canSeeGymContent(actor, header)) {
                    throw CommunityException.forbidden("NOT_A_MEMBER", "You are not a member of that gym");
                }
                yield header;
            }
            case PLATFORM -> tenantDataSources.singlePrimaryGymSlug().orElseThrow(() ->
                    CommunityException.forbidden("NO_GYM_SCOPE", "Platform accounts have no gym Community"));
        };
        return new Scope(actor, gym, BranchContextHolder.getActiveBranchId(), new Request(Surface.LEGACY, header, null));
    }

    private static String selectedGymHeader() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            String h = attrs.getRequest().getHeader("X-Tenant-ID");
            return h == null || h.isBlank() ? null : h.trim();
        }
        return null;
    }

    // ── Reads ───────────────────────────────────────────────────────────────

    /** Endpoint 1. */
    public CommunityPostsPageResponseDTO getFeed(String q, String type, int page, int limit, Boolean archived) {
        Scope s = scope();
        rollout.requireReads(Surface.LEGACY, s.gym());
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        int safePage = Math.max(page, 1);
        Long me = authors.findId(s.actor()).orElse(null);
        boolean archivedOnly = Boolean.TRUE.equals(archived);
        if (archivedOnly && me == null) {
            return new CommunityPostsPageResponseDTO(List.of(), new PaginationDTO(safePage, safeLimit, 0, 0));
        }

        MapSqlParameterSource p = new MapSqlParameterSource("gym", s.gym());
        StringBuilder where = new StringBuilder(" WHERE p.author_tenant_slug = :gym");
        if (archivedOnly) {
            where.append(" AND p.status = 'ARCHIVED' AND p.author_id = :me");
            p.addValue("me", me);
        } else {
            where.append(" AND p.status = 'ACTIVE'");
        }
        branchFilter(s, where, p);
        String normalizedType = type == null || type.isBlank() || type.equalsIgnoreCase("all") ? null : type.trim();
        if (normalizedType != null) {
            where.append(" AND lower(p.type) = :type");
            p.addValue("type", normalizedType.toLowerCase(Locale.ROOT));
        }
        String normalizedQ = q == null || q.isBlank() ? null : q.trim();
        if (normalizedQ != null) {
            where.append(" AND (lower(p.topic) LIKE :q ESCAPE '\\' OR lower(p.content) LIKE :q ESCAPE '\\')");
            p.addValue("q", "%" + CommunityPostStore.escapeLike(normalizedQ.toLowerCase(Locale.ROOT)) + "%");
        }

        Long total = db.jdbc().queryForObject("SELECT count(*) FROM global_community_posts p" + where, p, Long.class);
        List<Long> ids = db.jdbc().queryForList("SELECT p.id FROM global_community_posts p" + where
                + " ORDER BY p.created_at DESC, p.id DESC LIMIT :limit OFFSET :offset",
                p.addValue("limit", safeLimit).addValue("offset", (long) (safePage - 1) * safeLimit), Long.class);
        List<PostRow> rows = new ArrayList<>();
        for (Long id : ids) {
            posts.findById(id).ifPresent(rows::add);
        }
        int totalPages = (int) Math.ceil((double) (total == null ? 0 : total) / safeLimit);
        return new CommunityPostsPageResponseDTO(toLegacyPosts(rows, me), new PaginationDTO(safePage, safeLimit, total == null ? 0 : total, totalPages));
    }

    /** Endpoint 3. */
    public List<CommunityPostCommentResponseDTO> getComments(Long postId) {
        Scope s = scope();
        rollout.requireReads(Surface.LEGACY, s.gym());
        PostRow post = resolvePost(s, postId);
        Viewer viewer = community.viewer(s.actor(), s.gym());
        List<CommentRow> visible = interactions.commentsForPost(post.id()).stream()
                .filter(c -> CommunityModerationPolicy.canView(viewer, CommunityViews.facts(c, post)))
                .toList();
        Map<Long, AuthorRow> byId = authors.findByIds(visible.stream().map(CommentRow::authorId).collect(Collectors.toSet()));
        return visible.stream().map(c -> toLegacyComment(c, post.id(), byId.get(c.authorId()))).toList();
    }

    // ── Writes (through the same service as the new API) ────────────────────

    /** Endpoint 2. */
    public CommunityPostResponseDTO createPost(CreateCommunityPostRequestDTO body) {
        Scope s = scope();
        GlobalCommunityDtos.ImageUpload image = body.getImageDataUrl() == null || body.getImageDataUrl().isBlank() ? null
                : new GlobalCommunityDtos.ImageUpload(body.getImageDataUrl(), body.getImageAspectRatio(),
                body.getImageCropPosition(), body.getImageCropZoom());
        String gymContext = s.actor().isGlobal() ? s.gym() : null;
        long id = legacyErrors("Post not found", "Not allowed to create a post", () ->
                community.createPost(s.request(), new GlobalCommunityDtos.CreatePost(body.getTopic(), body.getContent(),
                        body.getType(), gymContext, image)).id());
        return reloadPost(id, s);
    }

    /** Endpoint 4. */
    public CommunityPostCommentResponseDTO addComment(Long postId, CreateCommunityCommentRequestDTO body) {
        Scope s = scope();
        PostRow post = resolvePost(s, postId);
        String gymContext = s.actor().isGlobal() ? s.gym() : null;
        long commentId = legacyErrors("Post not found", "Not allowed to comment on this post", () ->
                community.addComment(s.request(), post.id(), new GlobalCommunityDtos.CreateComment(
                        body == null ? null : body.getContent(), gymContext)).id());
        CommentRow c = interactions.findComment(commentId).orElseThrow();
        return toLegacyComment(c, post.id(), authors.findByIds(List.of(c.authorId())).get(c.authorId()));
    }

    /** Endpoint 5: the legacy toggle, over idempotent like/unlike. */
    public ToggleCommunityLikeResponseDTO toggleLike(Long postId) {
        Scope s = scope();
        PostRow post = resolvePost(s, postId);
        Long me = authors.findId(s.actor()).orElse(null);
        boolean liked = me != null && posts.likedBy(me, List.of(post.id())).contains(post.id());
        GlobalCommunityDtos.LikeResult r = legacyErrors("Post not found", "Not allowed to like this post", () ->
                liked ? community.unlike(s.request(), post.id()) : community.like(s.request(), post.id()));
        return new ToggleCommunityLikeResponseDTO(r.liked(), r.likeCount());
    }

    /** Endpoint 6. */
    public void deletePost(Long postId) {
        Scope s = scope();
        PostRow post = resolvePost(s, postId);
        legacyErrors("Post not found", "Not allowed to delete this post", () -> {
            community.deletePost(s.request(), post.id());
            return null;
        });
    }

    /** Endpoint 7. */
    public void deleteComment(Long postId, Long commentId) {
        Scope s = scope();
        PostRow post = resolvePost(s, postId);
        CommentRow comment = resolveComment(s, commentId);
        if (comment.postId() != post.id()) {
            throw new IllegalArgumentException("Comment not found");
        }
        legacyErrors("Comment not found", "Not allowed to delete this comment", () -> {
            community.deleteComment(s.request(), comment.id());
            return null;
        });
    }

    /** Endpoints 8 and 9. */
    public CommunityPostResponseDTO setArchived(Long postId, boolean archived) {
        Scope s = scope();
        PostRow post = resolvePost(s, postId);
        legacyErrors("Post not found", "Not allowed to update this post", () ->
                archived ? community.archive(s.request(), post.id()) : community.unarchive(s.request(), post.id()));
        return reloadPost(post.id(), s);
    }

    // ── Stats (endpoints 10–12), gym- and branch-scoped like before ─────────

    private record StatRow(long authorId, String type, String topic, int likes, int comments, LocalDateTime createdAt) {}

    private List<StatRow> statRows(Scope s) {
        MapSqlParameterSource p = new MapSqlParameterSource("gym", s.gym());
        StringBuilder where = new StringBuilder(" WHERE p.author_tenant_slug = :gym AND p.status = 'ACTIVE'");
        branchFilter(s, where, p);
        return db.jdbc().query("SELECT p.author_id, p.type, p.topic, p.like_count, p.comment_count, p.created_at "
                        + "FROM global_community_posts p" + where + " ORDER BY p.id", p,
                (rs, n) -> new StatRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getInt(5),
                        rs.getTimestamp(6).toLocalDateTime()));
    }

    /** Endpoint 10 — same aggregation as CommunityService.getEngagementStats. */
    public CommunityEngagementStatsDTO getEngagementStats() {
        Scope s = scope();
        rollout.requireReads(Surface.LEGACY, s.gym());
        List<StatRow> rows = statRows(s);
        CommunityEngagementStatsDTO dto = new CommunityEngagementStatsDTO();
        dto.setTotalPosts(rows.size());
        dto.setTotalLikes(rows.stream().mapToLong(StatRow::likes).sum());
        dto.setTotalComments(rows.stream().mapToLong(StatRow::comments).sum());

        Map<String, long[]> byType = new LinkedHashMap<>();
        for (StatRow r : rows) {
            String t = r.type() != null && !r.type().isBlank() ? r.type() : "other";
            long[] agg = byType.computeIfAbsent(t, k -> new long[3]);
            agg[0]++;
            agg[1] += r.likes();
            agg[2] += r.comments();
        }
        dto.setByType(byType.entrySet().stream()
                .map(e -> new CommunityEngagementStatsDTO.TypeBreakdown(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .sorted(Comparator.comparingLong(CommunityEngagementStatsDTO.TypeBreakdown::getPosts).reversed())
                .collect(Collectors.toList()));

        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        List<LocalDate> weekStarts = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            weekStarts.add(currentWeekStart.minusWeeks(i));
        }
        Map<LocalDate, long[]> weekly = new LinkedHashMap<>();
        weekStarts.forEach(w -> weekly.put(w, new long[3]));
        for (StatRow r : rows) {
            long[] agg = weekly.get(r.createdAt().toLocalDate().with(DayOfWeek.MONDAY));
            if (agg != null) {
                agg[0]++;
                agg[1] += r.likes();
                agg[2] += r.comments();
            }
        }
        DateTimeFormatter label = DateTimeFormatter.ofPattern("MMM d");
        dto.setWeekly(weekStarts.stream().map(w -> {
            long[] agg = weekly.get(w);
            return new CommunityEngagementStatsDTO.WeeklyPoint(w.format(label), agg[0], agg[1], agg[2]);
        }).collect(Collectors.toList()));
        return dto;
    }

    /** Endpoint 11. */
    public List<TrendingTopicDTO> getTrendingTopics() {
        Scope s = scope();
        rollout.requireReads(Surface.LEGACY, s.gym());
        LocalDate cutoff = LocalDate.now().minusDays(30);
        Map<String, Integer> counts = new HashMap<>();
        for (StatRow r : statRows(s)) {
            if (r.topic() != null && !r.topic().isBlank() && !r.createdAt().toLocalDate().isBefore(cutoff)) {
                counts.merge(r.topic().trim(), 1, Integer::sum);
            }
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(10)
                .map(e -> new TrendingTopicDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    /** Endpoint 12. */
    public List<LeaderboardEntryDTO> getLeaderboard() {
        Scope s = scope();
        rollout.requireReads(Surface.LEGACY, s.gym());
        Map<Long, long[]> agg = new LinkedHashMap<>();
        for (StatRow r : statRows(s)) {
            long[] a = agg.computeIfAbsent(r.authorId(), k -> new long[3]);
            a[0]++;
            a[1] += r.likes();
            a[2] += r.comments();
        }
        Map<Long, AuthorRow> byId = authors.findByIds(agg.keySet());
        return agg.entrySet().stream()
                .map(e -> {
                    AuthorRow a = byId.get(e.getKey());
                    return new LeaderboardEntryDTO(a == null ? null : legacyUserId(a), a == null ? "Unknown" : a.displayName(),
                            (int) e.getValue()[0], e.getValue()[1], e.getValue()[2]);
                })
                .sorted(Comparator.comparingLong(LeaderboardEntryDTO::getEngagementScore).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static void branchFilter(Scope s, StringBuilder where, MapSqlParameterSource p) {
        if (s.branchId() != null) {
            where.append(" AND p.author_branch_id = :branch");
            p.addValue("branch", s.branchId());
        }
    }

    /**
     * Resolves an ID an old client sent, always within the caller's gym (and
     * branch): a global ID must belong to this gym; a smaller ID is looked up as
     * the stored legacy_id of this gym's migrated rows. Never guessed.
     */
    private PostRow resolvePost(Scope s, Long postId) {
        if (postId == null) {
            throw new IllegalArgumentException("Post not found");
        }
        Long globalId;
        if (postId >= GLOBAL_ID_START) {
            globalId = postId;
        } else {
            List<Long> ids = db.jdbc().queryForList("SELECT id FROM global_community_posts WHERE origin = 'LEGACY' "
                            + "AND legacy_id = :id AND author_tenant_slug = :gym",
                    new MapSqlParameterSource("id", postId).addValue("gym", s.gym()), Long.class);
            globalId = ids.size() == 1 ? ids.get(0) : null;
        }
        PostRow post = globalId == null ? null : posts.findById(globalId).orElse(null);
        if (post == null || !s.gym().equals(post.authorTenantSlug()) || "DELETED".equals(post.status())
                || (s.branchId() != null && !s.branchId().equals(post.authorBranchId()))) {
            throw new IllegalArgumentException("Post not found");
        }
        return post;
    }

    private CommentRow resolveComment(Scope s, Long commentId) {
        if (commentId == null) {
            throw new IllegalArgumentException("Comment not found");
        }
        Long globalId;
        if (commentId >= GLOBAL_ID_START) {
            globalId = commentId;
        } else {
            List<Long> ids = db.jdbc().queryForList("SELECT c.id FROM global_community_comments c "
                            + "JOIN global_community_posts p ON p.id = c.post_id WHERE c.origin = 'LEGACY' AND c.legacy_id = :id "
                            + "AND p.author_tenant_slug = :gym",
                    new MapSqlParameterSource("id", commentId).addValue("gym", s.gym()), Long.class);
            globalId = ids.size() == 1 ? ids.get(0) : null;
        }
        if (globalId == null) {
            throw new IllegalArgumentException("Comment not found");
        }
        return interactions.findComment(globalId)
                .filter(c -> !"DELETED".equals(c.status()))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
    }

    /** Translates the new API's refusals into what the legacy controller maps to 400/401/403. */
    private static <T> T legacyErrors(String notFound, String notAllowed, java.util.function.Supplier<T> work) {
        try {
            return work.get();
        } catch (CommunityException e) {
            switch (e.getCode()) {
                case "NOT_FOUND" -> throw new IllegalArgumentException(notFound);
                case "NOT_ALLOWED" -> throw new SecurityException(notAllowed);
                default -> throw e;
            }
        }
    }

    private CommunityPostResponseDTO reloadPost(long globalId, Scope s) {
        PostRow row = posts.findById(globalId).orElseThrow(() -> new IllegalArgumentException("Post not found"));
        return toLegacyPosts(List.of(row), authors.findId(s.actor()).orElse(null)).get(0);
    }

    private List<CommunityPostResponseDTO> toLegacyPosts(List<PostRow> rows, Long me) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = CommunityPostStore.ids(rows);
        Map<Long, AuthorRow> byId = authors.findByIds(rows.stream().map(PostRow::authorId).collect(Collectors.toSet()));
        Set<Long> liked = me == null ? Set.of() : posts.likedBy(me, ids);
        List<CommunityPostResponseDTO> out = new ArrayList<>();
        for (PostRow p : rows) {
            AuthorRow a = byId.get(p.authorId());
            CommunityPostResponseDTO dto = new CommunityPostResponseDTO();
            dto.setId(p.id());
            dto.setTopic(p.topic());
            dto.setContent(p.content());
            dto.setType(p.type());
            dto.setLikeCount(p.likeCount());
            dto.setCommentCount(p.commentCount());
            dto.setLikedByMe(liked.contains(p.id()));
            if (p.hasImage()) {
                dto.setImage(posts.findImage(p.id()).map(img -> new CommunityPostImageDTO(
                        "data:" + img.contentType() + ";base64," + Base64.getEncoder().encodeToString(img.data()),
                        p.imageAspectRatio(), p.imageCropPosition(), p.imageCropZoom())).orElse(null));
            }
            dto.setAuthorUserId(a == null ? null : legacyUserId(a));
            dto.setAuthorUsername(a == null ? "GymBios member" : a.displayName());
            dto.setAuthorRoles(a == null ? List.of() : List.of(legacyRole(a)));
            dto.setCreatedAt(p.createdAt());
            dto.setArchived("ARCHIVED".equals(p.status()));
            out.add(dto);
        }
        return out;
    }

    private static CommunityPostCommentResponseDTO toLegacyComment(CommentRow c, long postId, AuthorRow a) {
        CommunityPostCommentResponseDTO dto = new CommunityPostCommentResponseDTO();
        dto.setId(c.id());
        dto.setPostId(postId);
        dto.setContent(c.content());
        dto.setAuthorUserId(a == null ? null : legacyUserId(a));
        dto.setAuthorUsername(a == null ? "GymBios member" : a.displayName());
        dto.setAuthorRoles(a == null ? List.of() : List.of(legacyRole(a)));
        dto.setCreatedAt(c.createdAt());
        return dto;
    }

    /** The ID in the author's own identity space — what each old client compares its own user ID with. */
    static Long legacyUserId(AuthorRow a) {
        return switch (a.kind()) {
            case "GLOBAL" -> a.globalUserId();
            case "TENANT" -> a.tenantUserId();
            default -> a.platformUserId();
        };
    }

    private static String legacyRole(AuthorRow a) {
        if ("GLOBAL".equals(a.kind())) return "MEMBER";
        if ("PLATFORM".equals(a.kind())) return "GYMBIOS_ADMIN";
        return a.primaryRole() == null ? "MEMBER" : a.primaryRole();
    }
}
