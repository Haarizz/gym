package com.company.project.controllers.mobile.community;

import com.company.project.community.global.CommunityModerationService;
import com.company.project.community.global.GlobalCommunityService;
import com.company.project.community.global.GlobalCommunityService.Request;
import com.company.project.community.global.rollout.CommunityRolloutService.Surface;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * The global Community API, served under two prefixes:
 *   /api/mobile/community  — the mobile app (mobile_surface flag)
 *   /api/community/global  — the web app   (web_surface flag)
 *
 * Additive: the legacy tenant-scoped /api/community/** endpoints are untouched.
 * Controllers are thin; identity, rollout gates, visibility and authorization
 * all live in the services. X-Tenant-ID is passed only as a hint (pilot
 * targeting and the default posting gym, which is still membership-checked).
 */
@RestController
@RequestMapping({GlobalCommunityController.MOBILE, GlobalCommunityController.WEB})
public class GlobalCommunityController {

    static final String MOBILE = "/api/mobile/community";
    static final String WEB = "/api/community/global";

    private final GlobalCommunityService community;
    private final CommunityModerationService moderation;

    public GlobalCommunityController(GlobalCommunityService community, CommunityModerationService moderation) {
        this.community = community;
        this.moderation = moderation;
    }

    private static Request req(HttpServletRequest http) {
        String uri = http.getRequestURI();
        boolean web = uri != null && uri.startsWith(WEB);
        String selectedGym = http.getHeader("X-Tenant-ID");
        return new Request(web ? Surface.WEB : Surface.MOBILE,
                selectedGym == null || selectedGym.isBlank() ? null : selectedGym.trim(), web ? WEB : MOBILE);
    }

    // ── Reads ───────────────────────────────────────────────────────────────

    @GetMapping("/config")
    public GlobalCommunityDtos.ClientConfig config(HttpServletRequest http) {
        return community.clientConfig(req(http));
    }

    @GetMapping("/feed")
    public GlobalCommunityDtos.FeedPage feed(HttpServletRequest http,
                                             @RequestParam(required = false) String cursor,
                                             @RequestParam(required = false) Integer limit,
                                             @RequestParam(required = false) String type,
                                             @RequestParam(required = false) String q) {
        return community.feed(req(http), cursor, limit, type, q);
    }

    @GetMapping("/gyms/{gym}/feed")
    public GlobalCommunityDtos.FeedPage gymFeed(HttpServletRequest http, @PathVariable String gym,
                                                @RequestParam(required = false) String cursor,
                                                @RequestParam(required = false) Integer limit,
                                                @RequestParam(required = false) String type) {
        return community.gymFeed(req(http), gym, cursor, limit, type);
    }

    @GetMapping("/me/posts")
    public GlobalCommunityDtos.FeedPage myPosts(HttpServletRequest http,
                                                @RequestParam(required = false) String status,
                                                @RequestParam(required = false) String cursor,
                                                @RequestParam(required = false) Integer limit) {
        return community.myPosts(req(http), status, cursor, limit);
    }

    @GetMapping("/posts/{id}")
    public GlobalCommunityDtos.Post post(HttpServletRequest http, @PathVariable long id) {
        return community.post(req(http), id);
    }

    @GetMapping("/posts/{id}/image")
    public ResponseEntity<byte[]> image(HttpServletRequest http, @PathVariable long id) {
        CommunityPostStore.Image image = community.image(req(http), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .eTag("\"" + image.sha256() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(image.data());
    }

    @GetMapping("/posts/{id}/comments")
    public List<GlobalCommunityDtos.Comment> comments(HttpServletRequest http, @PathVariable long id) {
        return community.comments(req(http), id);
    }

    @GetMapping("/trending")
    public List<GlobalCommunityDtos.TrendingTopic> trending(HttpServletRequest http) {
        return community.trending(req(http));
    }

    @GetMapping("/leaderboard")
    public List<GlobalCommunityDtos.LeaderboardEntry> leaderboard(HttpServletRequest http) {
        return community.leaderboard(req(http));
    }

    // ── Member actions ──────────────────────────────────────────────────────

    @PostMapping("/posts")
    public GlobalCommunityDtos.Post createPost(HttpServletRequest http, @RequestBody GlobalCommunityDtos.CreatePost body) {
        return community.createPost(req(http), body);
    }

    @PostMapping("/posts/{id}/archive")
    public GlobalCommunityDtos.Post archive(HttpServletRequest http, @PathVariable long id) {
        return community.archive(req(http), id);
    }

    @PostMapping("/posts/{id}/unarchive")
    public GlobalCommunityDtos.Post unarchive(HttpServletRequest http, @PathVariable long id) {
        return community.unarchive(req(http), id);
    }

    @DeleteMapping("/posts/{id}")
    public Map<String, Boolean> deletePost(HttpServletRequest http, @PathVariable long id) {
        community.deletePost(req(http), id);
        return Map.of("success", true);
    }

    /** POST alias for clients/proxies that block DELETE (same convention as the legacy API). */
    @PostMapping("/posts/{id}/delete")
    public Map<String, Boolean> deletePostViaPost(HttpServletRequest http, @PathVariable long id) {
        return deletePost(http, id);
    }

    @PostMapping("/posts/{id}/comments")
    public GlobalCommunityDtos.Comment addComment(HttpServletRequest http, @PathVariable long id,
                                                  @RequestBody GlobalCommunityDtos.CreateComment body) {
        return community.addComment(req(http), id, body);
    }

    @DeleteMapping("/comments/{id}")
    public Map<String, Boolean> deleteComment(HttpServletRequest http, @PathVariable long id) {
        community.deleteComment(req(http), id);
        return Map.of("success", true);
    }

    @PostMapping("/comments/{id}/delete")
    public Map<String, Boolean> deleteCommentViaPost(HttpServletRequest http, @PathVariable long id) {
        return deleteComment(http, id);
    }

    @PutMapping("/posts/{id}/like")
    public GlobalCommunityDtos.LikeResult like(HttpServletRequest http, @PathVariable long id) {
        return community.like(req(http), id);
    }

    @DeleteMapping("/posts/{id}/like")
    public GlobalCommunityDtos.LikeResult unlike(HttpServletRequest http, @PathVariable long id) {
        return community.unlike(req(http), id);
    }

    @PostMapping("/posts/{id}/like")
    public GlobalCommunityDtos.LikeResult likeViaPost(HttpServletRequest http, @PathVariable long id) {
        return like(http, id);
    }

    @PostMapping("/posts/{id}/unlike")
    public GlobalCommunityDtos.LikeResult unlikeViaPost(HttpServletRequest http, @PathVariable long id) {
        return unlike(http, id);
    }

    @PostMapping("/posts/{id}/report")
    public GlobalCommunityDtos.ReportResult reportPost(HttpServletRequest http, @PathVariable long id,
                                                       @RequestBody GlobalCommunityDtos.CreateReport body) {
        return community.reportPost(req(http), id, body);
    }

    @PostMapping("/comments/{id}/report")
    public GlobalCommunityDtos.ReportResult reportComment(HttpServletRequest http, @PathVariable long id,
                                                          @RequestBody GlobalCommunityDtos.CreateReport body) {
        return community.reportComment(req(http), id, body);
    }

    // ── Moderation (gym-scoped; authorization in the service) ───────────────

    @GetMapping("/moderation/queue")
    public GlobalCommunityDtos.ModerationQueue moderationQueue(HttpServletRequest http) {
        return moderation.queue(req(http));
    }

    @PostMapping("/posts/{id}/hide")
    public GlobalCommunityDtos.Post hidePost(HttpServletRequest http, @PathVariable long id,
                                             @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.hidePost(req(http), id, body);
    }

    @PostMapping("/posts/{id}/restore")
    public GlobalCommunityDtos.Post restorePost(HttpServletRequest http, @PathVariable long id,
                                                @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.restorePost(req(http), id, body);
    }

    @PostMapping("/comments/{id}/hide")
    public GlobalCommunityDtos.Comment hideComment(HttpServletRequest http, @PathVariable long id,
                                                   @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.hideComment(req(http), id, body);
    }

    @PostMapping("/comments/{id}/restore")
    public GlobalCommunityDtos.Comment restoreComment(HttpServletRequest http, @PathVariable long id,
                                                      @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.restoreComment(req(http), id, body);
    }

    @PostMapping("/reports/{id}/resolve")
    public GlobalCommunityDtos.Report resolveReport(HttpServletRequest http, @PathVariable long id,
                                                    @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.resolveReport(req(http), id, body);
    }

    @PostMapping("/reports/{id}/dismiss")
    public GlobalCommunityDtos.Report dismissReport(HttpServletRequest http, @PathVariable long id,
                                                    @RequestBody(required = false) GlobalCommunityDtos.Moderate body) {
        return moderation.dismissReport(req(http), id, body);
    }
}
