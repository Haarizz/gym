package com.company.project.controllers;

import com.company.project.services.FinancialAnalyticsService;
import com.company.project.services.FinancialOverviewService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/financial-analytics")
public class FinancialAnalyticsController {

    private final FinancialAnalyticsService financialAnalyticsService;
    private final FinancialOverviewService financialOverviewService;

    public FinancialAnalyticsController(FinancialAnalyticsService financialAnalyticsService,
                                        FinancialOverviewService financialOverviewService) {
        this.financialAnalyticsService = financialAnalyticsService;
        this.financialOverviewService = financialOverviewService;
    }

    /**
     * GET /api/financial-analytics/overview?from=2026-10-01&to=2026-10-19&compare=previous|year
     * Everything the Financial Analytics page shows for the range, next to the comparison period.
     * Defaults: this month to date, compared with the previous period of the same length.
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "previous") String compare,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate compareTo) {
        return ResponseEntity.ok(financialOverviewService.overview(from, to, compare, compareFrom, compareTo));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(financialAnalyticsService.getDashboard());
    }

    @GetMapping("/monthly-trend")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyTrend(
            @RequestParam(defaultValue = "12") int months) {
        return ResponseEntity.ok(financialAnalyticsService.getMonthlyTrend(months));
    }

    @GetMapping("/revenue-by-source")
    public ResponseEntity<List<Map<String, Object>>> getRevenueBySource() {
        return ResponseEntity.ok(financialAnalyticsService.getRevenueBySource());
    }

    @GetMapping("/expense-by-category")
    public ResponseEntity<List<Map<String, Object>>> getExpenseByCategory() {
        return ResponseEntity.ok(financialAnalyticsService.getExpenseByCategory());
    }

    @GetMapping("/outstanding-payments")
    public ResponseEntity<List<Map<String, Object>>> getOutstandingPayments() {
        return ResponseEntity.ok(financialAnalyticsService.getOutstandingPayments());
    }

    @GetMapping("/pending-reconciliations")
    public ResponseEntity<List<Map<String, Object>>> getPendingReconciliations() {
        return ResponseEntity.ok(financialAnalyticsService.getPendingReconciliations());
    }
}
