package com.company.project.controllers.mobile.performance;

import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.performance.MobileStaffPerformanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/staff/performance")
public class MobileStaffPerformanceController {

    private final MobileStaffPerformanceService performanceService;

    public MobileStaffPerformanceController(MobileStaffPerformanceService performanceService) {
        this.performanceService = performanceService;
    }

    /**
     * GET /api/mobile/staff/performance
     * Returns the aggregated performance dataset required by the GymBios-Mobile Staff Performance screen.
     * Automatically scopes the metrics and identity to the authenticated staff member from SecurityContext.
     */
    @GetMapping
    public ResponseEntity<StaffPerformanceResponseDTO> getStaffPerformance(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(performanceService.getStaffPerformance(principal));
    }
}
