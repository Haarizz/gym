package com.company.project.community.global.policy;

import com.company.project.community.global.identity.CommunityActor;

import java.util.EnumSet;
import java.util.Set;

/**
 * The single source of truth for who may do what in the global Community.
 * Pure: every input is passed in, nothing is looked up, so each rule is unit
 * tested cell by cell. Services call it to *enforce*; response DTOs call the
 * same methods to fill viewer capabilities, so the UI can never offer an action
 * the server would refuse.
 *
 * Core rule: visibility is global; moderation authority belongs to the gym the
 * content was written from (its authorTenantSlug), exercised only by tenant
 * staff of that gym holding COMMUNITY_MODERATE. Cross-gym visibility or
 * interaction never grants cross-gym moderation. Global and platform accounts
 * never moderate in version 1.
 */
public final class CommunityModerationPolicy {

    public enum PostStatus { ACTIVE, ARCHIVED, HIDDEN, DELETED }

    public enum Visibility { PUBLIC, GYM }

    public enum HideScope { AUTHOR_GYM, POST_OWNER_GYM, PLATFORM }

    /**
     * @param actor        who is asking
     * @param authorId     the actor's community_authors.id, or null if they have never written anything
     * @param verifiedGym  a gym the actor was verified to belong to in this request (JWT tenant for
     *                     staff; a membership-checked gym for global users), or null
     * @param moderationEnabled rollout flag; when off nobody moderates
     */
    public record Viewer(CommunityActor actor, Long authorId, String verifiedGym, boolean moderationEnabled) {
        boolean isAuthorOf(long contentAuthorId) {
            return authorId != null && authorId == contentAuthorId;
        }
    }

    public record PostFacts(long authorId, String authorTenantSlug, PostStatus status, Visibility visibility) {}

    public record CommentFacts(long authorId, String authorTenantSlug, boolean deleted, Set<HideScope> hides,
                               PostFacts post) {
        public CommentFacts {
            hides = hides == null || hides.isEmpty() ? EnumSet.noneOf(HideScope.class) : EnumSet.copyOf(hides);
        }
    }

    public record ReportFacts(String targetAuthorTenantSlug, String contextTenantSlug) {}

    private CommunityModerationPolicy() {}

    // ── Moderator identity ──────────────────────────────────────────────────

    public static boolean isGymModerator(Viewer viewer, String gym) {
        CommunityActor actor = viewer.actor();
        return viewer.moderationEnabled()
                && gym != null
                && actor.isTenant()
                && gym.equals(actor.tenantSlug())
                && actor.hasPermission(CommunityActor.MODERATE_PERMISSION);
    }

    // ── Posts ───────────────────────────────────────────────────────────────

    public static boolean canView(Viewer viewer, PostFacts post) {
        if (post.status() == PostStatus.DELETED) {
            return false;
        }
        if (viewer.isAuthorOf(post.authorId())) {
            return true;
        }
        if (post.status() != PostStatus.ACTIVE) {
            return isGymModerator(viewer, post.authorTenantSlug());
        }
        return post.visibility() == Visibility.PUBLIC || post.authorTenantSlug().equals(viewer.verifiedGym());
    }

    /** Liking, commenting and reporting need a live, visible post. */
    public static boolean canInteract(Viewer viewer, PostFacts post) {
        return post.status() == PostStatus.ACTIVE && canView(viewer, post) && !viewer.actor().isPlatform();
    }

    public static boolean canArchive(Viewer viewer, PostFacts post) {
        return viewer.isAuthorOf(post.authorId()) && post.status() == PostStatus.ACTIVE;
    }

    public static boolean canUnarchive(Viewer viewer, PostFacts post) {
        return viewer.isAuthorOf(post.authorId()) && post.status() == PostStatus.ARCHIVED;
    }

    public static boolean canDelete(Viewer viewer, PostFacts post) {
        return viewer.isAuthorOf(post.authorId()) && post.status() != PostStatus.DELETED;
    }

    public static boolean canHide(Viewer viewer, PostFacts post) {
        return (post.status() == PostStatus.ACTIVE || post.status() == PostStatus.ARCHIVED)
                && isGymModerator(viewer, post.authorTenantSlug());
    }

    public static boolean canRestore(Viewer viewer, PostFacts post) {
        return post.status() == PostStatus.HIDDEN && isGymModerator(viewer, post.authorTenantSlug());
    }

    public static boolean canReport(Viewer viewer, PostFacts post) {
        return canInteract(viewer, post) && !viewer.isAuthorOf(post.authorId());
    }

    // ── Comments ────────────────────────────────────────────────────────────

    public static boolean canView(Viewer viewer, CommentFacts comment) {
        if (comment.deleted() || !canView(viewer, comment.post())) {
            return false;
        }
        if (comment.hides().isEmpty() || viewer.isAuthorOf(comment.authorId())) {
            return true;
        }
        return !hideScopes(viewer, comment).isEmpty();
    }

    public static boolean canDelete(Viewer viewer, CommentFacts comment) {
        return viewer.isAuthorOf(comment.authorId()) && !comment.deleted();
    }

    /**
     * The scopes this viewer may hide the comment under (C5): the commenter's
     * gym moderates its member's comments anywhere; the post owner's gym can
     * hide comments appearing on its members' posts. When both are the same
     * gym, AUTHOR_GYM (the broader scope) is offered.
     */
    public static Set<HideScope> hideScopes(Viewer viewer, CommentFacts comment) {
        Set<HideScope> scopes = EnumSet.noneOf(HideScope.class);
        if (comment.deleted()) {
            return scopes;
        }
        if (isGymModerator(viewer, comment.authorTenantSlug())) {
            scopes.add(HideScope.AUTHOR_GYM);
        } else if (isGymModerator(viewer, comment.post().authorTenantSlug())) {
            scopes.add(HideScope.POST_OWNER_GYM);
        }
        return scopes;
    }

    public static boolean canHide(Viewer viewer, CommentFacts comment, HideScope scope) {
        return hideScopes(viewer, comment).contains(scope) && !comment.hides().contains(scope);
    }

    /** Each scope can only lift its own hide. */
    public static boolean canRestore(Viewer viewer, CommentFacts comment, HideScope scope) {
        if (!comment.hides().contains(scope) || comment.deleted()) {
            return false;
        }
        return switch (scope) {
            case AUTHOR_GYM -> isGymModerator(viewer, comment.authorTenantSlug());
            case POST_OWNER_GYM -> isGymModerator(viewer, comment.post().authorTenantSlug());
            case PLATFORM -> false;
        };
    }

    public static boolean canReport(Viewer viewer, CommentFacts comment) {
        return canView(viewer, comment) && comment.hides().isEmpty()
                && canInteract(viewer, comment.post()) && !viewer.isAuthorOf(comment.authorId());
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    /** Reports route by the stored gyms of the content — never by the viewer's active tenant. */
    public static Set<HideScope> reportScopes(Viewer viewer, ReportFacts report) {
        Set<HideScope> scopes = EnumSet.noneOf(HideScope.class);
        if (isGymModerator(viewer, report.targetAuthorTenantSlug())) {
            scopes.add(HideScope.AUTHOR_GYM);
        }
        if (report.contextTenantSlug() != null && isGymModerator(viewer, report.contextTenantSlug())
                && !report.contextTenantSlug().equals(report.targetAuthorTenantSlug())) {
            scopes.add(HideScope.POST_OWNER_GYM);
        }
        return scopes;
    }
}
