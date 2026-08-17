package com.company.project.controllers.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.StaffDashboardResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.dashboard.MobileStaffDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/staff/dashboard")
public class MobileStaffDashboardController {

    private final MobileStaffDashboardService dashboardService;

    public MobileStaffDashboardController(MobileStaffDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /api/mobile/staff/dashboard
     * Returns the aggregated dashboard dataset required by the GymBios-Mobile Staff Dashboard screen.
     * Automatically scopes the metrics and identity to the authenticated staff member.
     */
    @GetMapping
    public ResponseEntity<StaffDashboardResponseDTO> getStaffDashboard(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(dashboardService.getStaffDashboard(principal));
    }
}
