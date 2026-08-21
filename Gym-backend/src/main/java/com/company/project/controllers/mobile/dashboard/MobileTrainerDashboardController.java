package com.company.project.controllers.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.trainer.TrainerDashboardResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.dashboard.MobileTrainerDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/trainer/dashboard")
public class MobileTrainerDashboardController {

    private final MobileTrainerDashboardService dashboardService;

    public MobileTrainerDashboardController(MobileTrainerDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /api/mobile/trainer/dashboard
     * Returns the aggregated dashboard dataset required by the GymBios-Mobile Trainer Dashboard screen.
     * Automatically scopes the metrics and identity to the authenticated trainer.
     */
    @GetMapping
    public ResponseEntity<TrainerDashboardResponseDTO> getTrainerDashboard(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(dashboardService.getTrainerDashboard(principal));
    }
}
