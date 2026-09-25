package com.company.project.community.global;

import com.company.project.community.global.content.CommunityContentValidator;
import com.company.project.community.global.identity.CommunityActor;
import com.company.project.community.global.identity.CommunityActorResolver;
import com.company.project.community.global.identity.CommunityAuthorProfiles;
import com.company.project.community.global.identity.CommunityGymContextResolver;
import com.company.project.community.global.identity.CommunityGymContextResolver.GymContext;
import com.company.project.community.global.policy.CommunityModerationPolicy;
import com.company.project.community.global.policy.CommunityModerationPolicy.PostFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.Viewer;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.community.global.rollout.CommunityRolloutService.Operation;
import com.company.project.community.global.rollout.CommunityRolloutService.Surface;
import com.company.project.controlplane.community.store.CommunityAuthorStore;
import com.company.project.controlplane.community.store.CommunityAuthorStore.AuthorRow;
import com.company.project.controlplane.community.store.CommunityDb;
import com.company.project.controlplane.community.store.CommunityInteractionStore;
import com.company.project.controlplane.community.store.CommunityInteractionStore.CommentRow;
import com.company.project.controlplane.community.store.CommunityModerationStore;
import com.company.project.controlplane.community.store.CommunityModerationStore.NewReport;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityPostStore.Cursor;
import com.company.project.controlplane.community.store.CommunityPostStore.Filter;
import com.company.project.controlplane.community.store.CommunityPostStore.Image;
import com.company.project.controlplane.community.store.CommunityPostStore.NewImage;
import com.company.project.controlplane.community.store.CommunityPostStore.NewPost;
import com.company.project.controlplane.community.store.CommunityPostStore.PostRow;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Global Community reads and member actions. Every method follows the same
 * order: resolve the actor (the only identity source) → check the rollout
 * gate → load the target (anything the caller may not see is 404) → check
 * CommunityModerationPolicy → write. Reads from gym databases (profiles,
 * memberships) happen before the control-plane transaction opens, so no
 * transaction spans two databases.
 */
@Service
public class GlobalCommunityService {

    /** Per-request context supplied by the controller. selectedGym is a hint (pilot targeting / default posting gym), never authorization. */
    public record Request(Surface surface, String selectedGym, String imageBase) {}

    static final int MAX_PAGE = 50;
    private static final long AGGREGATE_CACHE_MS = 60_000;

    private final CommunityActorResolver actorResolver;
    private final CommunityGymContextResolver gymContexts;
    private final CommunityAuthorProfiles profiles;
    private final CommunityRolloutService rollout;
    private final CommunityDb db;
    private final CommunityAuthorStore authors;
    private final CommunityPostStore posts;
    private final CommunityInteractionStore interactions;
    private final CommunityModerationStore moderation;
    private final CommunityContentValidator validator;
    private final CommunityViews views;
    private final CommunityAuditLog audit;

    private volatile Cached<List<GlobalCommunityDtos.TrendingTopic>> trending;
    private volatile Cached<List<GlobalCommunityDtos.LeaderboardEntry>> leaderboard;

    private record Cached<T>(T value, long at) {}

    public GlobalCommunityService(CommunityActorResolver actorResolver, CommunityGymContextResolver gymContexts,
                                  CommunityAuthorProfiles profiles, CommunityRolloutService rollout, CommunityDb db,
                                  CommunityAuthorStore authors, CommunityPostStore posts,
                                  CommunityInteractionStore interactions, CommunityModerationStore moderation,
                                  CommunityContentValidator validator, CommunityViews views, CommunityAuditLog audit) {
        this.actorResolver = actorResolver;
        this.gymContexts = gymContexts;
        this.profiles = profiles;
        this.rollout = rollout;
        this.db = db;
        this.authors = authors;
        this.posts = posts;
        this.interactions = interactions;
        this.moderation = moderation;
        this.validator = validator;
        this.views = views;
        this.audit = audit;
    }

    // ── Reads ───────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.FeedPage feed(Request req, String cursor, Integer limit, String type, String query) {
        CommunityActor actor = actorResolver.current();
        return audit.run("FEED", req.surface().name(), actor, targetingGym(actor, req), null, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            int n = pageSize(limit);
            List<PostRow> rows = posts.publicFeed(filter(type, query), decodeCursor(cursor), n + 1);
            return page(rows, n, viewer(actor, ownGym(actor)), req);
        });
    }

    /** One gym's posts, including its gym-only history (C2). Only for that gym's staff and verified members. */
    public GlobalCommunityDtos.FeedPage gymFeed(Request req, String gym, String cursor, Integer limit, String type) {
        CommunityActor actor = actorResolver.current();
        return audit.run("GYM_FEED", req.surface().name(), actor, gym, null, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            if (!gymContexts.canSeeGymContent(actor, gym)) {
                throw CommunityException.forbidden("NOT_A_MEMBER", "You are not a member of that gym");
            }
            int n = pageSize(limit);
            List<PostRow> rows = posts.gymFeed(gym, filter(type, null), decodeCursor(cursor), n + 1);
            return page(rows, n, viewer(actor, gym), req);
        });
    }

    public GlobalCommunityDtos.FeedPage myPosts(Request req, String statuses, String cursor, Integer limit) {
        CommunityActor actor = actorResolver.current();
        return audit.run("MY_POSTS", req.surface().name(), actor, targetingGym(actor, req), null, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            Long authorId = authors.findId(actor).orElse(null);
            if (authorId == null) {
                return new GlobalCommunityDtos.FeedPage(List.of(), null);
            }
            int n = pageSize(limit);
            List<PostRow> rows = posts.byAuthor(authorId, statusFilter(statuses), decodeCursor(cursor), n + 1);
            return page(rows, n, new Viewer(actor, authorId, ownGym(actor), rollout.moderationEnabled()), req);
        });
    }

    public GlobalCommunityDtos.Post post(Request req, long postId) {
        CommunityActor actor = actorResolver.current();
        return audit.run("POST_GET", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            Visible v = visiblePost(actor, postId);
            return views.post(v.post(), v.viewer(), req.imageBase());
        });
    }

    public Image image(Request req, long postId) {
        CommunityActor actor = actorResolver.current();
        return audit.run("IMAGE_GET", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            visiblePost(actor, postId);
            return posts.findImage(postId).orElseThrow(() -> CommunityException.notFound("Image"));
        });
    }

    public List<GlobalCommunityDtos.Comment> comments(Request req, long postId) {
        CommunityActor actor = actorResolver.current();
        return audit.run("COMMENTS_GET", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            Visible v = visiblePost(actor, postId);
            return views.comments(interactions.commentsForPost(postId), v.post(), v.viewer());
        });
    }

    public List<GlobalCommunityDtos.TrendingTopic> trending(Request req) {
        CommunityActor actor = actorResolver.current();
        rollout.requireReads(req.surface(), targetingGym(actor, req));
        return cached(trending, () -> posts.trendingTopics(30, 10).stream()
                .map(t -> new GlobalCommunityDtos.TrendingTopic(t.topic(), t.posts())).toList(), v -> trending = v);
    }

    public List<GlobalCommunityDtos.LeaderboardEntry> leaderboard(Request req) {
        CommunityActor actor = actorResolver.current();
        rollout.requireReads(req.surface(), targetingGym(actor, req));
        return cached(leaderboard, () -> {
            var rows = posts.leaderboard(10);
            Map<Long, AuthorRow> byId = authors.findByIds(rows.stream().map(CommunityPostStore.AuthorEngagement::authorId).toList());
            List<GlobalCommunityDtos.LeaderboardEntry> out = new ArrayList<>();
            for (var r : rows) {
                AuthorRow a = byId.get(r.authorId());
                out.add(new GlobalCommunityDtos.LeaderboardEntry(a == null ? "GymBios member" : a.displayName(),
                        a == null ? null : a.avatarUrl(), r.posts(), r.likes(), r.comments(), r.likes() + r.comments()));
            }
            return out;
        }, v -> leaderboard = v);
    }

    /** What the client may show. Never throws for a disabled Community — that's the answer. */
    public GlobalCommunityDtos.ClientConfig clientConfig(Request req) {
        CommunityActor actor = actorResolver.current();
        boolean available;
        try {
            rollout.requireReads(req.surface(), targetingGym(actor, req));
            available = true;
        } catch (CommunityException e) {
            available = false;
        }
        var s = rollout.state();
        boolean open = available && "OPEN".equals(s.writeMode());
        boolean writer = !actor.isPlatform();
        GlobalCommunityDtos.Limits limits = new GlobalCommunityDtos.Limits(
                CommunityContentValidator.MAX_TOPIC, CommunityContentValidator.MAX_POST, CommunityContentValidator.MAX_COMMENT,
                CommunityContentValidator.MAX_IMAGE_BYTES, CommunityContentValidator.MAX_IMAGE_DIMENSION,
                List.of("image/jpeg", "image/png"), sorted(CommunityContentValidator.POST_TYPES),
                sorted(CommunityContentValidator.ASPECT_RATIOS), sorted(CommunityContentValidator.REPORT_REASONS));
        String postingSlug = null;
        String postingName = null;
        String blocked = null;
        if (available) {
            try {
                GymContext ctx = gymContexts.resolveForWrite(actor, requestedGym(actor, null, req));
                postingSlug = ctx.tenantSlug();
                postingName = ctx.gymName();
            } catch (CommunityException e) {
                blocked = e.getCode();
            }
        }
        boolean canWriteThere = blocked == null;
        return new GlobalCommunityDtos.ClientConfig(available, available && !open,
                open && writer && canWriteThere && s.opPost(), open && writer && canWriteThere && s.opComment(),
                open && writer && s.opLike(), open && writer && s.opReport() && s.reports(),
                available && s.moderation() && actor.isTenant(), limits, postingSlug, postingName, blocked);
    }

    // ── Posts ───────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.Post createPost(Request req, GlobalCommunityDtos.CreatePost body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("POST_CREATE", req.surface().name(), actor, targetingGym(actor, req), null, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.POST);
            if (body == null) {
                throw CommunityException.invalid("BODY_REQUIRED", "Request body is required");
            }
            CommunityContentValidator.ValidPost valid = validator.post(body.topic(), body.content(), body.type());
            NewImage image = body.image() == null ? null : validator.image(body.image().dataUrl(), body.image().aspectRatio(),
                    body.image().cropPosition(), body.image().cropZoom());
            GymContext ctx = gymContexts.resolveForWrite(actor, requestedGym(actor, body.gymContext(), req));
            CommunityAuthorStore.Profile profile = profiles.profileOf(actor);

            long postId = db.inTransaction(() -> {
                long authorId = authors.upsert(actor, profile);
                // Old clients present a gym-scoped Community, so what their users write stays gym-only.
                String visibility = req.surface() == Surface.LEGACY ? "GYM" : "PUBLIC";
                long id = posts.insert(new NewPost(authorId, ctx.tenantSlug(), ctx.branchId(), ctx.memberId(),
                        ctx.gymName(), ctx.branchName(), valid.topic(), valid.content(), valid.type(), visibility));
                if (image != null) {
                    posts.insertImage(id, image);
                }
                return id;
            });
            PostRow row = posts.findById(postId).orElseThrow();
            return views.post(row, viewer(actor, ctx.tenantSlug()), req.imageBase());
        });
    }

    public GlobalCommunityDtos.Post archive(Request req, long postId) {
        return authorTransition(req, postId, "POST_ARCHIVE", CommunityModerationPolicy::canArchive, posts::archive);
    }

    public GlobalCommunityDtos.Post unarchive(Request req, long postId) {
        return authorTransition(req, postId, "POST_UNARCHIVE", CommunityModerationPolicy::canUnarchive, posts::unarchive);
    }

    public void deletePost(Request req, long postId) {
        CommunityActor actor = actorResolver.current();
        audit.run("POST_DELETE", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.POST);
            Visible v = visiblePost(actor, postId);
            if (!CommunityModerationPolicy.canDelete(v.viewer(), CommunityViews.facts(v.post()))) {
                throw notAllowed();
            }
            if (!posts.delete(postId, v.post().status())) {
                throw stateChanged();
            }
            return null;
        });
    }

    private GlobalCommunityDtos.Post authorTransition(Request req, long postId, String op,
                                                      java.util.function.BiPredicate<Viewer, PostFacts> allowed,
                                                      java.util.function.LongPredicate transition) {
        CommunityActor actor = actorResolver.current();
        return audit.run(op, req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.POST);
            Visible v = visiblePost(actor, postId);
            if (!allowed.test(v.viewer(), CommunityViews.facts(v.post()))) {
                throw notAllowed();
            }
            if (!transition.test(postId)) {
                throw stateChanged();
            }
            return views.post(posts.findById(postId).orElseThrow(), v.viewer(), req.imageBase());
        });
    }

    // ── Comments ────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.Comment addComment(Request req, long postId, GlobalCommunityDtos.CreateComment body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("COMMENT_CREATE", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.COMMENT);
            String content = validator.comment(body == null ? null : body.content());
            Visible v = visiblePost(actor, postId);
            if (!CommunityModerationPolicy.canInteract(v.viewer(), CommunityViews.facts(v.post()))) {
                throw notAllowed();
            }
            GymContext ctx = gymContexts.resolveForWrite(actor, requestedGym(actor, body.gymContext(), req));
            CommunityAuthorStore.Profile profile = profiles.profileOf(actor);

            long[] ids = db.inTransaction(() -> {
                long authorId = authors.upsert(actor, profile);
                long commentId = interactions.insertComment(postId, authorId, ctx.tenantSlug(), ctx.memberId(), content);
                posts.adjustCommentCount(postId, +1);
                return new long[]{authorId, commentId};
            });
            CommentRow comment = interactions.findComment(ids[1]).orElseThrow();
            Viewer viewer = new Viewer(actor, ids[0], v.viewer().verifiedGym(), rollout.moderationEnabled());
            return views.comment(comment, v.post(), authors.findByIds(List.of(ids[0])).get(ids[0]), viewer);
        });
    }

    public void deleteComment(Request req, long commentId) {
        CommunityActor actor = actorResolver.current();
        audit.run("COMMENT_DELETE", req.surface().name(), actor, targetingGym(actor, req), "comment:" + commentId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.COMMENT);
            VisibleComment vc = visibleComment(actor, commentId);
            if (!CommunityModerationPolicy.canDelete(vc.viewer(), CommunityViews.facts(vc.comment(), vc.post()))) {
                throw notAllowed();
            }
            db.inTransaction(() -> {
                if (interactions.deleteComment(commentId)) {
                    posts.adjustCommentCount(vc.post().id(), -1);
                }
            });
            return null;
        });
    }

    // ── Likes ───────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.LikeResult like(Request req, long postId) {
        return setLike(req, postId, true);
    }

    public GlobalCommunityDtos.LikeResult unlike(Request req, long postId) {
        return setLike(req, postId, false);
    }

    /** Idempotent: liking twice or unliking something not liked changes nothing, including the counter. */
    private GlobalCommunityDtos.LikeResult setLike(Request req, long postId, boolean like) {
        CommunityActor actor = actorResolver.current();
        return audit.run(like ? "LIKE" : "UNLIKE", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.LIKE);
            requireWritableIdentity(actor);
            Visible v = visiblePost(actor, postId);
            if (like && !CommunityModerationPolicy.canInteract(v.viewer(), CommunityViews.facts(v.post()))) {
                throw notAllowed();
            }
            Long existing = v.viewer().authorId();
            CommunityAuthorStore.Profile profile = existing == null ? profiles.profileOf(actor) : null;
            db.inTransaction(() -> {
                long authorId = existing != null ? existing : authors.upsert(actor, profile);
                boolean changed = like ? interactions.like(postId, authorId) : interactions.unlike(postId, authorId);
                if (changed) {
                    posts.adjustLikeCount(postId, like ? +1 : -1);
                }
            });
            return new GlobalCommunityDtos.LikeResult(like, posts.findById(postId).orElseThrow().likeCount());
        });
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.ReportResult reportPost(Request req, long postId, GlobalCommunityDtos.CreateReport body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("REPORT_POST", req.surface().name(), actor, targetingGym(actor, req), "post:" + postId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.REPORT);
            requireWritableIdentity(actor);
            Visible v = visiblePost(actor, postId);
            if (!CommunityModerationPolicy.canReport(v.viewer(), CommunityViews.facts(v.post()))) {
                throw notAllowed();
            }
            return fileReport(actor, v.viewer().authorId(), "POST", postId, v.post().authorId(),
                    v.post().authorTenantSlug(), null, body);
        });
    }

    public GlobalCommunityDtos.ReportResult reportComment(Request req, long commentId, GlobalCommunityDtos.CreateReport body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("REPORT_COMMENT", req.surface().name(), actor, targetingGym(actor, req), "comment:" + commentId, () -> {
            rollout.requireWrite(req.surface(), targetingGym(actor, req), Operation.REPORT);
            requireWritableIdentity(actor);
            VisibleComment vc = visibleComment(actor, commentId);
            if (!CommunityModerationPolicy.canReport(vc.viewer(), CommunityViews.facts(vc.comment(), vc.post()))) {
                throw notAllowed();
            }
            return fileReport(actor, vc.viewer().authorId(), "COMMENT", commentId, vc.comment().authorId(),
                    vc.comment().authorTenantSlug(), vc.post().authorTenantSlug(), body);
        });
    }

    private GlobalCommunityDtos.ReportResult fileReport(CommunityActor actor, Long existingAuthorId, String type, long targetId,
                                                        long targetAuthorId, String targetGym, String contextGym,
                                                        GlobalCommunityDtos.CreateReport body) {
        String reason = validator.reportReason(body == null ? null : body.reason());
        String details = validator.optionalText(body == null ? null : body.details(),
                CommunityContentValidator.MAX_REPORT_DETAILS, "DETAILS_TOO_LONG");
        CommunityAuthorStore.Profile profile = existingAuthorId == null ? profiles.profileOf(actor) : null;
        return db.inTransaction(() -> {
            long reporter = existingAuthorId != null ? existingAuthorId : authors.upsert(actor, profile);
            var id = moderation.insertReport(new NewReport(type, targetId, reporter, reason, details, targetGym,
                    "COMMENT".equals(type) && !targetGym.equals(contextGym) ? contextGym : null));
            if (id.isEmpty()) {
                return new GlobalCommunityDtos.ReportResult(0, true);
            }
            // Conflict of interest: staff of the moderating gym can't be judged only by their own gym.
            AuthorRow target = authors.findByIds(List.of(targetAuthorId)).get(targetAuthorId);
            if (target != null && "TENANT".equals(target.kind()) && targetGym.equals(target.tenantSlug())) {
                moderation.escalateNow(id.get());
            }
            return new GlobalCommunityDtos.ReportResult(id.get(), false);
        });
    }

    // ── Shared helpers ──────────────────────────────────────────────────────

    record Visible(PostRow post, Viewer viewer) {}

    record VisibleComment(CommentRow comment, PostRow post, Viewer viewer) {}

    /** Loads a post the actor may see; anything else — missing, deleted, hidden, other gym's private history — is 404. */
    Visible visiblePost(CommunityActor actor, long postId) {
        PostRow post = posts.findById(postId).orElseThrow(() -> CommunityException.notFound("Post"));
        String verifiedGym = ownGym(actor);
        if ("GYM".equals(post.visibility()) && actor.isGlobal() && gymContexts.canSeeGymContent(actor, post.authorTenantSlug())) {
            verifiedGym = post.authorTenantSlug();
        }
        Viewer viewer = viewer(actor, verifiedGym);
        if (!CommunityModerationPolicy.canView(viewer, CommunityViews.facts(post))) {
            throw CommunityException.notFound("Post");
        }
        return new Visible(post, viewer);
    }

    VisibleComment visibleComment(CommunityActor actor, long commentId) {
        CommentRow comment = interactions.findComment(commentId).orElseThrow(() -> CommunityException.notFound("Comment"));
        Visible v;
        try {
            v = visiblePost(actor, comment.postId());
        } catch (CommunityException e) {
            throw CommunityException.notFound("Comment");
        }
        if (!CommunityModerationPolicy.canView(v.viewer(), CommunityViews.facts(comment, v.post()))) {
            throw CommunityException.notFound("Comment");
        }
        return new VisibleComment(comment, v.post(), v.viewer());
    }

    Viewer viewer(CommunityActor actor, String verifiedGym) {
        return new Viewer(actor, authors.findId(actor).orElse(null), verifiedGym, rollout.moderationEnabled());
    }

    /** Staff always have their JWT gym verified; app members only after a membership check. */
    static String ownGym(CommunityActor actor) {
        return actor.isTenant() ? actor.tenantSlug() : null;
    }

    /** The gym used for pilot targeting only. */
    static String targetingGym(CommunityActor actor, Request req) {
        return actor.isTenant() ? actor.tenantSlug() : req.selectedGym();
    }

    /** App members default to their selected gym; the choice is still membership-checked. */
    private static String requestedGym(CommunityActor actor, String bodyGym, Request req) {
        if (bodyGym != null && !bodyGym.isBlank()) {
            return bodyGym.trim();
        }
        return actor.isGlobal() ? req.selectedGym() : null;
    }

    static void requireWritableIdentity(CommunityActor actor) {
        if (actor.isPlatform()) {
            throw CommunityException.forbidden("PLATFORM_CANNOT_POST", "Platform accounts can't interact in the Community");
        }
        if (actor.isTenant() && actor.tenantSlug() == null) {
            throw CommunityException.forbidden("MISSING_TENANT_CONTEXT", "Your session doesn't identify a gym; sign in again");
        }
        if (actor.isTenant() && actor.tenantSlug().chars().anyMatch(Character::isWhitespace)) {
            throw CommunityException.conflict("GYM_SLUG_INVALID", "This gym's identifier needs correcting before it can use the Community");
        }
    }

    private GlobalCommunityDtos.FeedPage page(List<PostRow> rows, int n, Viewer viewer, Request req) {
        String next = null;
        if (rows.size() > n) {
            rows = rows.subList(0, n);
            PostRow last = rows.get(rows.size() - 1);
            next = encodeCursor(new Cursor(last.createdAt(), last.id()));
        }
        return new GlobalCommunityDtos.FeedPage(views.posts(rows, viewer, req.imageBase()), next);
    }

    private static Filter filter(String type, String query) {
        String t = null;
        if (type != null && !type.isBlank() && !type.equalsIgnoreCase("all")) {
            t = type.trim().toLowerCase(Locale.ROOT);
            if (!CommunityContentValidator.POST_TYPES.contains(t)) {
                throw CommunityException.invalid("INVALID_TYPE", "Unknown post type");
            }
        }
        String q = query == null || query.isBlank() ? null : query.trim();
        if (q != null && q.length() > 100) {
            throw CommunityException.invalid("QUERY_TOO_LONG", "Search text can be at most 100 characters");
        }
        return new Filter(t, q);
    }

    private static List<String> statusFilter(String statuses) {
        if (statuses == null || statuses.isBlank()) {
            return List.of("ACTIVE", "ARCHIVED", "HIDDEN");
        }
        List<String> out = new ArrayList<>();
        for (String s : statuses.split(",")) {
            String v = s.trim().toUpperCase(Locale.ROOT);
            if (!Set.of("ACTIVE", "ARCHIVED", "HIDDEN").contains(v)) {
                throw CommunityException.invalid("INVALID_STATUS", "Status must be ACTIVE, ARCHIVED or HIDDEN");
            }
            out.add(v);
        }
        return out;
    }

    static int pageSize(Integer limit) {
        return limit == null ? 20 : Math.min(Math.max(limit, 1), MAX_PAGE);
    }

    static String encodeCursor(Cursor c) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((c.createdAt() + "|" + c.id()).getBytes(StandardCharsets.UTF_8));
    }

    static Cursor decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int bar = raw.lastIndexOf('|');
            return new Cursor(LocalDateTime.parse(raw.substring(0, bar)), Long.parseLong(raw.substring(bar + 1)));
        } catch (RuntimeException e) {
            throw CommunityException.invalid("INVALID_CURSOR", "Invalid page cursor");
        }
    }

    private static <T> T cached(Cached<T> current, Supplier<T> load, java.util.function.Consumer<Cached<T>> store) {
        if (current != null && System.currentTimeMillis() - current.at() < AGGREGATE_CACHE_MS) {
            return current.value();
        }
        T value = load.get();
        store.accept(new Cached<>(value, System.currentTimeMillis()));
        return value;
    }

    private static List<String> sorted(Set<String> values) {
        return values.stream().sorted().toList();
    }

    static CommunityException notAllowed() {
        return CommunityException.forbidden("NOT_ALLOWED", "You can't do that to this content");
    }

    static CommunityException stateChanged() {
        return CommunityException.conflict("STATE_CHANGED", "This content changed while you were acting on it; refresh and retry");
    }
}
