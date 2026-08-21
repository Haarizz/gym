package com.company.project.controllers.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.dashboard.MobileMemberDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/member/dashboard")
public class MobileMemberDashboardController {

    private final MobileMemberDashboardService dashboardService;

    public MobileMemberDashboardController(MobileMemberDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /api/mobile/member/dashboard
     * Returns the aggregated dashboard dataset required by the GymBios-Mobile Member Dashboard.
     * Automatically scopes the metrics and identity to the authenticated member.
     */
    @GetMapping
    public ResponseEntity<MemberDashboardResponseDTO> getMemberDashboard(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(dashboardService.getMemberDashboard(principal));
    }
}
