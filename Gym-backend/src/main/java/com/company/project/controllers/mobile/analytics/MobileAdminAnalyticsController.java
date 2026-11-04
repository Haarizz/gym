package com.company.project.controllers.mobile.analytics;

import com.company.project.dto.mobile.analytics.MobileAnalyticsDTOs.BookingsAnalytics;
import com.company.project.dto.mobile.analytics.MobileAnalyticsDTOs.MembershipAnalytics;
import com.company.project.dto.mobile.analytics.MobileAnalyticsDTOs.PosAnalytics;
import com.company.project.services.mobile.analytics.MobileAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mobile admin Analytics screen — one endpoint per tab. Scoped to the branch in
 * X-Active-Branch-Id (all branches when absent).
 * period: month (default, month to date) | last_month | 3m | 12m
 */
@RestController
@RequestMapping("/api/mobile/admin/analytics")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class MobileAdminAnalyticsController {

    private final MobileAnalyticsService analyticsService;

    public MobileAdminAnalyticsController(MobileAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/membership")
    public ResponseEntity<MembershipAnalytics> membership(@RequestParam(required = false) String period) {
        return ResponseEntity.ok(analyticsService.membership(period));
    }

    @GetMapping("/bookings")
    public ResponseEntity<BookingsAnalytics> bookings(@RequestParam(required = false) String period) {
        return ResponseEntity.ok(analyticsService.bookings(period));
    }

    @GetMapping("/pos")
    public ResponseEntity<PosAnalytics> pos(@RequestParam(required = false) String period) {
        return ResponseEntity.ok(analyticsService.pos(period));
    }
}
