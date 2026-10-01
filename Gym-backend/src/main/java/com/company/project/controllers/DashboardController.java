package com.company.project.controllers;

import com.company.project.dto.dashboard.DashboardDTOs.GenericResponse;
import com.company.project.services.DashboardService;
import com.company.project.services.RevenueDashboardService;
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

    public DashboardController(DashboardService dashboardService, RevenueDashboardService revenueDashboardService) {
        this.dashboardService = dashboardService;
        this.revenueDashboardService = revenueDashboardService;
    }

    // period: today | week (last 7 days) | month | lastMonth
    @GetMapping("/kpis")
    public ResponseEntity<GenericResponse<?>> getKPIs(@RequestParam(defaultValue = "today") String period) {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getKPIs(period)));
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

    // Web "Revenue Dashboard" tab: collection, expenses and per-stream breakdown for [from, to] (inclusive dates)
    @GetMapping("/revenue-summary")
    public ResponseEntity<GenericResponse<?>> getRevenueSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate to,
            @RequestParam(required = false) String granularity) {
        return ResponseEntity.ok(new GenericResponse<>(true, revenueDashboardService.getSummary(from, to, granularity)));
    }

    @GetMapping("/member-churn")
    public ResponseEntity<GenericResponse<?>> getMemberChurn() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getMemberChurnData()));
    }
}
