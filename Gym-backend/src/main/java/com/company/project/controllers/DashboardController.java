package com.company.project.controllers;

import com.company.project.dto.dashboard.DashboardDTOs.GenericResponse;
import com.company.project.services.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/kpis")
    public ResponseEntity<GenericResponse<?>> getKPIs() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getKPIs()));
    }

    @GetMapping("/revenue")
    public ResponseEntity<GenericResponse<?>> getRevenue() {
        return ResponseEntity.ok(new GenericResponse<>(true, dashboardService.getRevenueData()));
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
    public ResponseEntity<GenericResponse<?>> searchMembers(@org.springframework.web.bind.annotation.RequestParam String q) {
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
}
