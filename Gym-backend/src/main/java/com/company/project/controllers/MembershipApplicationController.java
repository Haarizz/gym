package com.company.project.controllers;

import com.company.project.dto.MembershipApplicationDTOs.ApplicationView;
import com.company.project.dto.MembershipApplicationDTOs.ApproveRequest;
import com.company.project.dto.MembershipApplicationDTOs.RejectRequest;
import com.company.project.dto.MembershipApplicationDTOs.ShareLink;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MembershipApplicationService;
import com.company.project.services.ServicePortfolioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Staff side of the public Service Portfolios link: the share link itself and the
 * queue of membership applications it collects (Approvals → Applications).
 * Permissions come from ModulePermissionRules: applications need MEMBERS (approve /
 * reject need MEMBERS_APPROVE), the share link MEMBERSHIP_PLANS.
 */
@RestController
public class MembershipApplicationController {

    private final MembershipApplicationService applicationService;
    private final ServicePortfolioService portfolioService;

    public MembershipApplicationController(MembershipApplicationService applicationService,
                                           ServicePortfolioService portfolioService) {
        this.applicationService = applicationService;
        this.portfolioService = portfolioService;
    }

    /** GET /api/plans/catalog-share-link — the active branch's public link (created on first use). */
    @GetMapping("/api/plans/catalog-share-link")
    public ResponseEntity<ShareLink> shareLink() {
        return ResponseEntity.ok(portfolioService.shareLink(false));
    }

    /** POST /api/plans/catalog-share-link/reset — new link; every link shared before stops working. */
    @PostMapping("/api/plans/catalog-share-link/reset")
    public ResponseEntity<ShareLink> resetShareLink() {
        return ResponseEntity.ok(portfolioService.shareLink(true));
    }

    /** GET /api/members/applications?status=pending|decided */
    @GetMapping("/api/members/applications")
    public ResponseEntity<List<ApplicationView>> list(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(applicationService.list(status));
    }

    @GetMapping("/api/members/applications/count")
    public ResponseEntity<Map<String, Long>> count() {
        return ResponseEntity.ok(Map.of("pending", applicationService.countPending()));
    }

    /** POST /api/members/applications/{id}/approve — body { "cash_received": true } for cash applications. */
    @PostMapping("/api/members/applications/{id}/approve")
    public ResponseEntity<ApplicationView> approve(@PathVariable Long id,
                                                   @RequestBody(required = false) ApproveRequest body,
                                                   @AuthenticationPrincipal UserDetailsImpl principal) {
        boolean cashReceived = body != null && Boolean.TRUE.equals(body.cashReceived());
        return ResponseEntity.ok(applicationService.approve(id, cashReceived, actor(principal)));
    }

    /** POST /api/members/applications/{id}/reject — body { "reason": "..." } */
    @PostMapping("/api/members/applications/{id}/reject")
    public ResponseEntity<ApplicationView> reject(@PathVariable Long id,
                                                  @RequestBody RejectRequest body,
                                                  @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(applicationService.reject(id, body != null ? body.reason() : null, actor(principal)));
    }

    private static String actor(UserDetailsImpl principal) {
        return principal != null ? principal.getUsername() : "Admin";
    }
}
