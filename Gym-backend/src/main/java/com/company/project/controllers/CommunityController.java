package com.company.project.controllers;

import com.company.project.community.global.LegacyCommunityCompatAdapter;
import com.company.project.dto.*;
import com.company.project.services.CommunityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * The legacy tenant-scoped Community API. Until the global Community cutover
 * (authority = GLOBAL) every call is served by CommunityService from the legacy
 * tables, exactly as before. From the cutover on, the same endpoints are served
 * by LegacyCommunityCompatAdapter from the global store — the only
 * authoritative store — with identical response shapes and status mapping
 * (see docs/community/phase5-adapter-contract.md). The switch is the authority
 * flag itself; it can't go back.
 */
@RestController
@RequestMapping("/api/community")
public class CommunityController {

    private final CommunityService communityService;
    private final LegacyCommunityCompatAdapter compat;

    public CommunityController(CommunityService communityService, LegacyCommunityCompatAdapter compat) {
        this.communityService = communityService;
        this.compat = compat;
    }

    @GetMapping("/stats")
    public ResponseEntity<CommunityEngagementStatsDTO> getEngagementStats() {
        return ResponseEntity.ok(compat.isActive() ? compat.getEngagementStats() : communityService.getEngagementStats());
    }

    @GetMapping("/stats/trending-topics")
    public ResponseEntity<java.util.List<TrendingTopicDTO>> getTrendingTopics() {
        return ResponseEntity.ok(compat.isActive() ? compat.getTrendingTopics() : communityService.getTrendingTopics());
    }

    @GetMapping("/stats/leaderboard")
    public ResponseEntity<java.util.List<LeaderboardEntryDTO>> getLeaderboard() {
        return ResponseEntity.ok(compat.isActive() ? compat.getLeaderboard() : communityService.getLeaderboard());
    }

    @GetMapping("/posts")
    public ResponseEntity<CommunityPostsPageResponseDTO> getFeed(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean archived,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        try {
            return ResponseEntity.ok(compat.isActive()
                    ? compat.getFeed(q, type, page, limit, archived)
                    : communityService.getFeed(q, type, page, limit, archived));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    @PostMapping("/posts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createPost(@RequestBody CreateCommunityPostRequestDTO request) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.createPost(request) : communityService.createPost(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommunityPostCommentResponseDTO>> getComments(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.getComments(postId) : communityService.getComments(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/posts/{postId}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> addComment(
            @PathVariable Long postId,
            @RequestBody CreateCommunityCommentRequestDTO request
    ) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.addComment(postId, request) : communityService.addComment(postId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> toggleLike(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.toggleLike(postId) : communityService.toggleLike(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deletePost(@PathVariable Long postId) {
        try {
            if (compat.isActive()) {
                compat.deletePost(postId);
            } else {
                communityService.deletePost(postId);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    // Some client environments/proxies can block HTTP DELETE; offer a POST alias for reliability.
    @PostMapping("/posts/{postId}/delete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deletePostViaPost(@PathVariable Long postId) {
        return deletePost(postId);
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteComment(@PathVariable Long postId, @PathVariable Long commentId) {
        try {
            if (compat.isActive()) {
                compat.deleteComment(postId, commentId);
            } else {
                communityService.deleteComment(postId, commentId);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    // Some client environments/proxies can block HTTP DELETE; offer a POST alias for reliability.
    @PostMapping("/posts/{postId}/comments/{commentId}/delete")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteCommentViaPost(@PathVariable Long postId, @PathVariable Long commentId) {
        return deleteComment(postId, commentId);
    }

    @PostMapping("/posts/{postId}/archive")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> archivePost(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.setArchived(postId, true) : communityService.archivePost(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/unarchive")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> unarchivePost(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(compat.isActive() ? compat.setArchived(postId, false) : communityService.unarchivePost(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }
}
