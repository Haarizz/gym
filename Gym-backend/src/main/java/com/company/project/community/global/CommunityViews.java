package com.company.project.community.global;

import com.company.project.community.global.policy.CommunityModerationPolicy;
import com.company.project.community.global.policy.CommunityModerationPolicy.CommentFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.HideScope;
import com.company.project.community.global.policy.CommunityModerationPolicy.PostFacts;
import com.company.project.community.global.policy.CommunityModerationPolicy.PostStatus;
import com.company.project.community.global.policy.CommunityModerationPolicy.Viewer;
import com.company.project.community.global.policy.CommunityModerationPolicy.Visibility;
import com.company.project.controlplane.community.store.CommunityAuthorStore;
import com.company.project.controlplane.community.store.CommunityAuthorStore.AuthorRow;
import com.company.project.controlplane.community.store.CommunityInteractionStore.CommentRow;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityPostStore.PostRow;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Turns stored rows into API responses. Every "viewer" flag is computed by
 * CommunityModerationPolicy — the same methods the services use to enforce —
 * so the UI can't offer an action the server would refuse.
 */
@Component
public class CommunityViews {

    private final CommunityAuthorStore authorStore;
    private final CommunityPostStore postStore;

    public CommunityViews(CommunityAuthorStore authorStore, CommunityPostStore postStore) {
        this.authorStore = authorStore;
        this.postStore = postStore;
    }

    public static PostFacts facts(PostRow p) {
        return new PostFacts(p.authorId(), p.authorTenantSlug(), PostStatus.valueOf(p.status()), Visibility.valueOf(p.visibility()));
    }

    public static CommentFacts facts(CommentRow c, PostRow post) {
        return new CommentFacts(c.authorId(), c.authorTenantSlug(), "DELETED".equals(c.status()), c.hides(), facts(post));
    }

    public List<GlobalCommunityDtos.Post> posts(List<PostRow> rows, Viewer viewer, String imageBase) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Long, AuthorRow> authors = authorStore.findByIds(rows.stream().map(PostRow::authorId).collect(Collectors.toSet()));
        Set<Long> liked = viewer.authorId() == null ? Set.of() : postStore.likedBy(viewer.authorId(), CommunityPostStore.ids(rows));
        List<GlobalCommunityDtos.Post> out = new ArrayList<>(rows.size());
        for (PostRow row : rows) {
            out.add(post(row, authors.get(row.authorId()), liked.contains(row.id()), viewer, imageBase));
        }
        return out;
    }

    public GlobalCommunityDtos.Post post(PostRow row, Viewer viewer, String imageBase) {
        return posts(List.of(row), viewer, imageBase).get(0);
    }

    private GlobalCommunityDtos.Post post(PostRow p, AuthorRow author, boolean liked, Viewer viewer, String imageBase) {
        PostFacts f = facts(p);
        boolean canInteract = CommunityModerationPolicy.canInteract(viewer, f);
        GlobalCommunityDtos.PostViewer flags = new GlobalCommunityDtos.PostViewer(
                liked,
                canInteract,
                canInteract,
                CommunityModerationPolicy.canReport(viewer, f),
                CommunityModerationPolicy.canArchive(viewer, f),
                CommunityModerationPolicy.canUnarchive(viewer, f),
                CommunityModerationPolicy.canDelete(viewer, f),
                CommunityModerationPolicy.canHide(viewer, f),
                CommunityModerationPolicy.canRestore(viewer, f));
        GlobalCommunityDtos.Image image = p.hasImage()
                ? new GlobalCommunityDtos.Image(imageBase + "/posts/" + p.id() + "/image", p.imageWidth(), p.imageHeight(),
                p.imageAspectRatio(), p.imageCropPosition(), p.imageCropZoom())
                : null;
        return new GlobalCommunityDtos.Post(p.id(), p.topic(), p.content(), p.type(), p.visibility(), p.status(),
                p.createdAt(), p.likeCount(), p.commentCount(), image,
                author(author, p.authorTenantSlug(), p.authorGymName(), p.authorBranchName(), viewer.isAuthorOf(p.authorId())),
                flags);
    }

    /** Comments of one post as this viewer may see them (hidden ones only for their author and moderators with a scope). */
    public List<GlobalCommunityDtos.Comment> comments(List<CommentRow> rows, PostRow post, Viewer viewer) {
        List<CommentRow> visible = rows.stream()
                .filter(c -> CommunityModerationPolicy.canView(viewer, facts(c, post)))
                .toList();
        if (visible.isEmpty()) {
            return List.of();
        }
        Map<Long, AuthorRow> authors = authorStore.findByIds(visible.stream().map(CommentRow::authorId).collect(Collectors.toSet()));
        List<GlobalCommunityDtos.Comment> out = new ArrayList<>(visible.size());
        for (CommentRow c : visible) {
            out.add(comment(c, post, authors.get(c.authorId()), viewer));
        }
        return out;
    }

    public GlobalCommunityDtos.Comment comment(CommentRow c, PostRow post, AuthorRow author, Viewer viewer) {
        CommentFacts f = facts(c, post);
        Set<HideScope> canHide = EnumSet.noneOf(HideScope.class);
        Set<HideScope> canRestore = EnumSet.noneOf(HideScope.class);
        for (HideScope scope : HideScope.values()) {
            if (CommunityModerationPolicy.canHide(viewer, f, scope)) canHide.add(scope);
            if (CommunityModerationPolicy.canRestore(viewer, f, scope)) canRestore.add(scope);
        }
        boolean mine = viewer.isAuthorOf(c.authorId());
        boolean mayKnowWhyHidden = mine || !CommunityModerationPolicy.hideScopes(viewer, f).isEmpty();
        GlobalCommunityDtos.CommentViewer flags = new GlobalCommunityDtos.CommentViewer(
                CommunityModerationPolicy.canDelete(viewer, f),
                CommunityModerationPolicy.canReport(viewer, f),
                names(canHide), names(canRestore));
        return new GlobalCommunityDtos.Comment(c.id(), c.postId(), c.content(), c.createdAt(), !c.hides().isEmpty(),
                mayKnowWhyHidden ? names(c.hides()) : Set.of(),
                author(author, c.authorTenantSlug(), null, null, mine), flags);
    }

    private static GlobalCommunityDtos.Author author(AuthorRow a, String gymSlug, String gymName, String branchName, boolean mine) {
        String role = a == null ? null : ("GLOBAL".equals(a.kind()) ? "MEMBER" : a.primaryRole());
        return new GlobalCommunityDtos.Author(a == null ? "GymBios member" : a.displayName(), a == null ? null : a.avatarUrl(),
                role, gymSlug, gymName, branchName, mine);
    }

    private static Set<String> names(Set<HideScope> scopes) {
        Set<String> out = new TreeSet<>();
        scopes.forEach(s -> out.add(s.name()));
        return out;
    }
}
