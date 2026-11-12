package com.company.project.controllers;

import com.company.project.dto.dashboard.DashboardDTOs.GenericResponse;
import com.company.project.services.BusinessInsightsService;
import com.company.project.services.DashboardService;
import com.company.project.services.RevenueDashboardService;
import com.company.project.services.RevenueOperationsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final RevenueDashboardService revenueDashboardService;
    private final RevenueOperationsService revenueOperationsService;
    private final BusinessInsightsService businessInsightsService;

    public DashboardController(DashboardService dashboardService, RevenueDashboardService revenueDashboardService,
                               RevenueOperationsService revenueOperationsService,
                               BusinessInsightsService businessInsightsService) {
        this.dashboardService = dashboardService;
        this.revenueDashboardService = revenueDashboardService;
        this.revenueOperationsService = revenueOperationsService;
        this.businessInsightsService = businessInsightsService;
    }

    // period: today | week (last 7 days) | month | lastMonth
    @GetMapping("/kpis")
    public ResponseEntity<GenericResponse<?>> getKPIs(@RequestParam(defaultValue = "today") String period) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getKPIs(period)));
    }

    // Overview "Subscriptions & Passes" cards — same period values as /kpis
    @GetMapping("/subscription-summary")
    public ResponseEntity<GenericResponse<?>> getSubscriptionSummary(@RequestParam(defaultValue = "today") String period) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getSubscriptionSummary(period)));
    }

    @GetMapping("/revenue")
    public ResponseEntity<GenericResponse<?>> getRevenue(@RequestParam(defaultValue = "today") String period) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getRevenueData(period)));
    }

    @GetMapping("/attendance-slots")
    public ResponseEntity<GenericResponse<?>> getAttendanceSlots(@RequestParam(defaultValue = "today") String period) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getAttendanceBySlot(period)));
    }

    @GetMapping("/membership-distribution")
    public ResponseEntity<GenericResponse<?>> getMembershipDistribution() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getMembershipDistribution()));
    }

    @GetMapping("/class-attendance")
    public ResponseEntity<GenericResponse<?>> getClassAttendance() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getClassAttendance()));
    }

    @GetMapping("/recent-members")
    public ResponseEntity<GenericResponse<?>> getRecentMembers() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getRecentMembers()));
    }

    @GetMapping("/notifications")
    public ResponseEntity<GenericResponse<?>> getNotifications() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getNotifications()));
    }

    @GetMapping("/staff-status")
    public ResponseEntity<GenericResponse<?>> getStaffStatus() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getStaffStatus()));
    }

    @GetMapping("/search-members")
    public ResponseEntity<GenericResponse<?>> searchMembers(@RequestParam String q) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.searchMembers(q)));
    }

    @GetMapping("/sales-pipeline")
    public ResponseEntity<GenericResponse<?>> getSalesPipeline() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getSalesPipeline()));
    }

    @GetMapping("/pending-tasks")
    public ResponseEntity<GenericResponse<?>> getPendingTasks() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getPendingTasks()));
    }

    // Web "Revenue Dashboard" tab: collection, expenses, per-stream breakdown and detailed reports for
    // [from, to] (inclusive dates), compared with the previous period or the same dates last year
    // (compare=previous|last-year)
    @GetMapping("/revenue-summary")
    public ResponseEntity<GenericResponse<?>> getRevenueSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String granularity,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, revenueDashboardService.getSummary(from, to, granularity, compare)));
    }

    // Revenue Dashboard › Comparison: freezes, CRM, POS, attendance, bookings and member movement for
    // [from, to] vs the same comparison window as /revenue-summary, with an aligned trend
    @GetMapping("/revenue-operations")
    public ResponseEntity<GenericResponse<?>> getRevenueOperations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String granularity,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, revenueOperationsService.getOperations(from, to, granularity, compare)));
    }

    // Revenue Dashboard › Comparison › Targets: institution + staff targets vs achieved for the months
    // the range (and its comparison window) touch, plus 12 months of institution target history
    @GetMapping("/revenue-targets")
    public ResponseEntity<GenericResponse<?>> getRevenueTargets(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, revenueOperationsService.getTargets(from, to, compare)));
    }

    // Business Insights sections, each loaded when opened
    @GetMapping("/insights/campaigns")
    public ResponseEntity<GenericResponse<?>> getCampaignInsights(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, businessInsightsService.getCampaigns(from, to, compare)));
    }

    @GetMapping("/insights/renewals")
    public ResponseEntity<GenericResponse<?>> getRenewalInsights(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, businessInsightsService.getRenewals(from, to, compare)));
    }

    @GetMapping("/insights/training")
    public ResponseEntity<GenericResponse<?>> getTrainingInsights(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String compare) {
        return ResponseEntity.ok(new GenericResponse<>(true, businessInsightsService.getTraining(from, to, compare)));
    }

    @GetMapping("/member-churn")
    public ResponseEntity<GenericResponse<?>> getMemberChurn() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getMemberChurnData()));
    }
}
