package com.company.project.controllers.mobile.analytics;

import com.company.project.dto.mobile.analytics.MobileAdminAnalyticsResponseDTO;
import com.company.project.services.mobile.analytics.MobileAdminAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/admin/analytics")
public class MobileAdminAnalyticsController {

    private final MobileAdminAnalyticsService mobileAdminAnalyticsService;

    public MobileAdminAnalyticsController(MobileAdminAnalyticsService mobileAdminAnalyticsService) {
        this.mobileAdminAnalyticsService = mobileAdminAnalyticsService;
    }

    @GetMapping
    public ResponseEntity<MobileAdminAnalyticsResponseDTO> getAnalytics() {
        return ResponseEntity.ok(mobileAdminAnalyticsService.getAnalytics());
    }
}
