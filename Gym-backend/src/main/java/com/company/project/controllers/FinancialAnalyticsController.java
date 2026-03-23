package com.company.project.controllers;

import com.company.project.services.FinancialAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/financial-analytics")
public class FinancialAnalyticsController {

    private final FinancialAnalyticsService financialAnalyticsService;

    public FinancialAnalyticsController(FinancialAnalyticsService financialAnalyticsService) {
        this.financialAnalyticsService = financialAnalyticsService;
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
}
