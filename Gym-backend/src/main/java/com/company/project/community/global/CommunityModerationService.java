package com.company.project.community.global;

import com.company.project.community.global.GlobalCommunityService.Request;
import com.company.project.community.global.GlobalCommunityService.Visible;
import com.company.project.community.global.GlobalCommunityService.VisibleComment;
import com.company.project.community.global.content.CommunityContentValidator;
import com.company.project.community.global.identity.CommunityActor;
import com.company.project.community.global.identity.CommunityActorResolver;
import com.company.project.community.global.identity.CommunityAuthorProfiles;
import com.company.project.community.global.policy.CommunityModerationPolicy;
import com.company.project.community.global.policy.CommunityModerationPolicy.CommentFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.HideScope;
import com.company.project.community.global.policy.CommunityModerationPolicy.ReportFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.Viewer;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.controlplane.community.store.CommunityAuthorStore;
import com.company.project.controlplane.community.store.CommunityDb;
import com.company.project.controlplane.community.store.CommunityInteractionStore;
import com.company.project.controlplane.community.store.CommunityInteractionStore.CommentRow;
import com.company.project.controlplane.community.store.CommunityModerationStore;
import com.company.project.controlplane.community.store.CommunityModerationStore.ReportRow;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityPostStore.PostRow;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Gym-scoped moderation (C5, C6). Moderators hide and restore; they never
 * delete or edit. Authority always comes from the stored gym of the content
 * compared with the moderator's JWT gym — never from a request parameter —
 * and every action is recorded in the append-only community_moderation_actions
 * inside the same transaction as the change.
 */
@Service
public class CommunityModerationService {

    private static final int QUEUE_LIMIT = 50;

    private final GlobalCommunityService community;
    private final CommunityActorResolver actorResolver;
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

    public CommunityModerationService(GlobalCommunityService community, CommunityActorResolver actorResolver,
                                      CommunityAuthorProfiles profiles, CommunityRolloutService rollout, CommunityDb db,
                                      CommunityAuthorStore authors, CommunityPostStore posts,
                                      CommunityInteractionStore interactions, CommunityModerationStore moderation,
                                      CommunityContentValidator validator, CommunityViews views, CommunityAuditLog audit) {
        this.community = community;
        this.actorResolver = actorResolver;
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

    // ── Posts ───────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.Post hidePost(Request req, long postId, GlobalCommunityDtos.Moderate body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("MOD_HIDE_POST", req.surface().name(), actor, actor.tenantSlug(), "post:" + postId, () -> {
            rollout.requireModeration(req.surface(), GlobalCommunityService.targetingGym(actor, req));
            Visible v = community.visiblePost(actor, postId);
            if (!CommunityModerationPolicy.canHide(v.viewer(), CommunityViews.facts(v.post()))) {
                throw GlobalCommunityService.notAllowed();
            }
            String reason = reason(body);
            long moderatorId = moderatorAuthorId(actor);
            db.inTransaction(() -> {
                if (!posts.hide(postId, v.post().status(), moderatorId, reason)) {
                    throw GlobalCommunityService.stateChanged();
                }
                moderation.recordAction("POST", postId, "HIDE", HideScope.AUTHOR_GYM.name(), moderatorId, actor.tenantSlug(), reason);
            });
            return reload(postId, actor, v.viewer().verifiedGym(), req);
        });
    }

    public GlobalCommunityDtos.Post restorePost(Request req, long postId, GlobalCommunityDtos.Moderate body) {
        CommunityActor actor = actorResolver.current();
        return audit.run("MOD_RESTORE_POST", req.surface().name(), actor, actor.tenantSlug(), "post:" + postId, () -> {
            rollout.requireModeration(req.surface(), GlobalCommunityService.targetingGym(actor, req));
            Visible v = community.visiblePost(actor, postId);
            if (!CommunityModerationPolicy.canRestore(v.viewer(), CommunityViews.facts(v.post()))) {
                throw GlobalCommunityService.notAllowed();
            }
            String reason = reason(body);
            long moderatorId = moderatorAuthorId(actor);
            db.inTransaction(() -> {
                if (!posts.restore(postId)) {
                    throw GlobalCommunityService.stateChanged();
                }
                moderation.recordAction("POST", postId, "RESTORE", HideScope.AUTHOR_GYM.name(), moderatorId, actor.tenantSlug(), reason);
            });
            return reload(postId, actor, v.viewer().verifiedGym(), req);
        });
    }

    // ── Comments ────────────────────────────────────────────────────────────

    public GlobalCommunityDtos.Comment hideComment(Request req, long commentId, GlobalCommunityDtos.Moderate body) {
        return commentAction(req, commentId, body, true);
    }

    public GlobalCommunityDtos.Comment restoreComment(Request req, long commentId, GlobalCommunityDtos.Moderate body) {
        return commentAction(req, commentId, body, false);
    }

    private GlobalCommunityDtos.Comment commentAction(Request req, long commentId, GlobalCommunityDtos.Moderate body, boolean hide) {
        CommunityActor actor = actorResolver.current();
        return audit.run(hide ? "MOD_HIDE_COMMENT" : "MOD_RESTORE_COMMENT", req.surface().name(), actor, actor.tenantSlug(),
                "comment:" + commentId, () -> {
                    rollout.requireModeration(req.surface(), GlobalCommunityService.targetingGym(actor, req));
                    VisibleComment vc = community.visibleComment(actor, commentId);
                    CommentFacts facts = CommunityViews.facts(vc.comment(), vc.post());
                    HideScope scope = scope(body, vc.viewer(), facts, hide);
                    boolean allowed = hide
                            ? CommunityModerationPolicy.canHide(vc.viewer(), facts, scope)
                            : CommunityModerationPolicy.canRestore(vc.viewer(), facts, scope);
                    if (!allowed) {
                        throw GlobalCommunityService.notAllowed();
                    }
                    String reason = reason(body);
                    long moderatorId = moderatorAuthorId(actor);
                    db.inTransaction(() -> {
                        boolean changed = hide
                                ? interactions.hideComment(commentId, scope, actor.tenantSlug(), moderatorId, reason)
                                : interactions.restoreComment(commentId, scope);
                        if (!changed) {
                            throw GlobalCommunityService.stateChanged();
                        }
                        moderation.recordAction("COMMENT", commentId, hide ? "HIDE" : "RESTORE", scope.name(), moderatorId,
                                actor.tenantSlug(), reason);
                    });
                    CommentRow updated = interactions.findComment(commentId).orElseThrow();
                    Viewer viewer = new Viewer(actor, moderatorId, vc.viewer().verifiedGym(), rollout.moderationEnabled());
                    return views.comment(updated, vc.post(), authors.findByIds(List.of(updated.authorId())).get(updated.authorId()), viewer);
                });
    }

    /**
     * An explicit scope is required when the moderator holds more than one;
     * otherwise the single applicable scope is used. Never inferred from the
     * request's selected gym.
     */
    private static HideScope scope(GlobalCommunityDtos.Moderate body, Viewer viewer, CommentFacts facts, boolean hide) {
        if (body != null && body.scope() != null && !body.scope().isBlank()) {
            try {
                return HideScope.valueOf(body.scope().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw CommunityException.invalid("INVALID_SCOPE", "Scope must be AUTHOR_GYM or POST_OWNER_GYM");
            }
        }
        Set<HideScope> candidates = new TreeSet<>();
        for (HideScope s : HideScope.values()) {
            if (hide ? CommunityModerationPolicy.canHide(viewer, facts, s) : CommunityModerationPolicy.canRestore(viewer, facts, s)) {
                candidates.add(s);
            }
        }
        if (candidates.size() != 1) {
            throw candidates.isEmpty() ? GlobalCommunityService.notAllowed()
                    : CommunityException.invalid("SCOPE_REQUIRED", "Choose which scope to act in");
        }
        return candidates.iterator().next();
    }

    // ── Queue and reports ───────────────────────────────────────────────────

    /** The moderator's own gym: its hidden posts, hidden comments by or on its members, and its reports. */
    public GlobalCommunityDtos.ModerationQueue queue(Request req) {
        CommunityActor actor = actorResolver.current();
        return audit.run("MOD_QUEUE", req.surface().name(), actor, actor.tenantSlug(), null, () -> {
            rollout.requireModeration(req.surface(), GlobalCommunityService.targetingGym(actor, req));
            String gym = actor.tenantSlug();
            Viewer viewer = community.viewer(actor, gym);
            if (!CommunityModerationPolicy.isGymModerator(viewer, gym)) {
                throw CommunityException.forbidden("NOT_A_MODERATOR", "You don't moderate a gym's Community");
            }
            List<PostRow> hiddenPosts = posts.gymPostsInStatus(gym, List.of("HIDDEN"), null, QUEUE_LIMIT);

            List<GlobalCommunityDtos.Comment> hiddenComments = new ArrayList<>();
            List<CommentRow> comments = interactions.hiddenCommentsForGym(gym, QUEUE_LIMIT);
            Map<Long, CommunityAuthorStore.AuthorRow> commentAuthors =
                    authors.findByIds(comments.stream().map(CommentRow::authorId).toList());
            for (CommentRow c : comments) {
                posts.findById(c.postId()).ifPresent(p ->
                        hiddenComments.add(views.comment(c, p, commentAuthors.get(c.authorId()), viewer)));
            }

            List<GlobalCommunityDtos.Report> reports = moderation.reportsForGym(gym, List.of("OPEN", "ESCALATED"), QUEUE_LIMIT)
                    .stream().map(r -> report(r, viewer)).toList();
            return new GlobalCommunityDtos.ModerationQueue(views.posts(hiddenPosts, viewer, req.imageBase()), hiddenComments, reports);
        });
    }

    public GlobalCommunityDtos.Report resolveReport(Request req, long reportId, GlobalCommunityDtos.Moderate body) {
        return closeReport(req, reportId, body, "RESOLVED", "RESOLVE_REPORT");
    }

    public GlobalCommunityDtos.Report dismissReport(Request req, long reportId, GlobalCommunityDtos.Moderate body) {
        return closeReport(req, reportId, body, "DISMISSED", "DISMISS_REPORT");
    }

    private GlobalCommunityDtos.Report closeReport(Request req, long reportId, GlobalCommunityDtos.Moderate body,
                                                   String finalStatus, String action) {
        CommunityActor actor = actorResolver.current();
        return audit.run("MOD_" + action, req.surface().name(), actor, actor.tenantSlug(), "report:" + reportId, () -> {
            rollout.requireModeration(req.surface(), GlobalCommunityService.targetingGym(actor, req));
            ReportRow report = moderation.findReport(reportId).orElseThrow(() -> CommunityException.notFound("Report"));
            Viewer viewer = community.viewer(actor, actor.tenantSlug());
            Set<HideScope> scopes = CommunityModerationPolicy.reportScopes(viewer,
                    new ReportFacts(report.targetAuthorTenantSlug(), report.contextTenantSlug()));
            if (scopes.isEmpty()) {
                throw CommunityException.notFound("Report");
            }
            HideScope scope = scopes.contains(HideScope.AUTHOR_GYM) ? HideScope.AUTHOR_GYM : scopes.iterator().next();
            String reason = reason(body);
            long moderatorId = moderatorAuthorId(actor);
            db.inTransaction(() -> {
                if (!moderation.close(reportId, finalStatus, moderatorId, scope.name())) {
                    throw GlobalCommunityService.stateChanged();
                }
                moderation.recordAction("REPORT", reportId, action, scope.name(), moderatorId, actor.tenantSlug(), reason);
            });
            return report(moderation.findReport(reportId).orElseThrow(), community.viewer(actor, actor.tenantSlug()));
        });
    }

    /** Read-only platform queue of escalated reports (platform actions are not part of version 1). */
    public List<GlobalCommunityDtos.Report> escalatedReports() {
        CommunityActor actor = actorResolver.current();
        if (!actor.isPlatform()) {
            throw CommunityException.forbidden("NOT_PLATFORM", "Only the platform owner can see escalated reports");
        }
        Viewer viewer = new Viewer(actor, null, null, false);
        return moderation.escalatedReports(QUEUE_LIMIT).stream().map(r -> report(r, viewer)).toList();
    }

    private static GlobalCommunityDtos.Report report(ReportRow r, Viewer viewer) {
        Set<String> scopes = new TreeSet<>();
        CommunityModerationPolicy.reportScopes(viewer, new ReportFacts(r.targetAuthorTenantSlug(), r.contextTenantSlug()))
                .forEach(s -> scopes.add(s.name()));
        return new GlobalCommunityDtos.Report(r.id(), r.targetType(), r.targetId(), r.reason(), r.details(),
                r.targetAuthorTenantSlug(), r.contextTenantSlug(), r.status(), r.createdAt(), scopes);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private GlobalCommunityDtos.Post reload(long postId, CommunityActor actor, String verifiedGym, Request req) {
        return views.post(posts.findById(postId).orElseThrow(), community.viewer(actor, verifiedGym), req.imageBase());
    }

    /** Moderators need an author row so their actions reference a real identity. */
    private long moderatorAuthorId(CommunityActor actor) {
        return authors.findId(actor).orElseGet(() -> authors.upsert(actor, profiles.profileOf(actor)));
    }

    private String reason(GlobalCommunityDtos.Moderate body) {
        return validator.optionalText(body == null ? null : body.reason(),
                CommunityContentValidator.MAX_MODERATION_REASON, "REASON_TOO_LONG");
    }
}
