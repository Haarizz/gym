package com.company.project.controllers.mobile.performance;

import com.company.project.dto.mobile.performance.TrainerPerformanceResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.performance.MobileTrainerPerformanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/trainer")
public class MobileTrainerPerformanceController {

    private final MobileTrainerPerformanceService performanceService;

    public MobileTrainerPerformanceController(MobileTrainerPerformanceService performanceService) {
        this.performanceService = performanceService;
    }

    @GetMapping("/performance")
    public ResponseEntity<TrainerPerformanceResponseDTO> getTrainerPerformance(@AuthenticationPrincipal UserDetailsImpl principal) {
        TrainerPerformanceResponseDTO response = performanceService.getTrainerPerformance(principal);
        return ResponseEntity.ok(response);
    }
}
