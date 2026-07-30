package com.company.project.controllers;

import com.company.project.dto.*;
import com.company.project.services.CommunityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @GetMapping("/stats")
    public ResponseEntity<CommunityEngagementStatsDTO> getEngagementStats() {
        return ResponseEntity.ok(communityService.getEngagementStats());
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
            return ResponseEntity.ok(communityService.getFeed(q, type, page, limit, archived));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/posts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createPost(@RequestBody CreateCommunityPostRequestDTO request) {
        try {
            return ResponseEntity.ok(communityService.createPost(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommunityPostCommentResponseDTO>> getComments(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(communityService.getComments(postId));
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
            return ResponseEntity.ok(communityService.addComment(postId, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/posts/{postId}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> toggleLike(@PathVariable Long postId) {
        try {
            return ResponseEntity.ok(communityService.toggleLike(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deletePost(@PathVariable Long postId) {
        try {
            communityService.deletePost(postId);
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
            communityService.deleteComment(postId, commentId);
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
            return ResponseEntity.ok(communityService.archivePost(postId));
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
            return ResponseEntity.ok(communityService.unarchivePost(postId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }
}
