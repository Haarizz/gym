package com.company.project.controllers.mobile.performance;

import com.company.project.dto.mobile.performance.MyPerformanceResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.performance.MobileMyPerformanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/performance")
public class MobileMyPerformanceController {

    private final MobileMyPerformanceService performanceService;

    public MobileMyPerformanceController(MobileMyPerformanceService performanceService) {
        this.performanceService = performanceService;
    }

    /**
     * GET /api/mobile/performance/me?role=staff|trainer
     * Month-to-date snapshot for the profile menu's "My Performance" screen, scoped to the
     * authenticated user's Staff record. {@code role} is the app role the user signed in as and
     * only selects which metric set is computed — never whose data is returned.
     */
    @GetMapping("/me")
    public ResponseEntity<MyPerformanceResponseDTO> getMyPerformance(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(defaultValue = "staff") String role) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(performanceService.getMyPerformance(principal, role));
    }
}
