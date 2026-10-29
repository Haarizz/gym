package com.company.project.controllers;

import com.company.project.dto.payroll.PayrollDashboardDTO;
import com.company.project.services.PayrollAnalyticsService;
import com.company.project.services.PayrollReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.YearMonth;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll-analytics")
public class PayrollAnalyticsController {

    private final PayrollAnalyticsService payrollAnalyticsService;
    private final PayrollReportService payrollReportService;

    public PayrollAnalyticsController(PayrollAnalyticsService payrollAnalyticsService,
                                      PayrollReportService payrollReportService) {
        this.payrollAnalyticsService = payrollAnalyticsService;
        this.payrollReportService = payrollReportService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        return ResponseEntity.ok(Map.of("data", payrollAnalyticsService.getDashboardData()));
    }

    /** Per-employee, per-month payroll behind Payroll Reports & Analytics; from / to are yyyy-MM. */
    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> getReport(@RequestParam(required = false) String from,
                                                         @RequestParam(required = false) String to) {
        YearMonth f, t;
        try {
            f = from != null && !from.isBlank() ? YearMonth.parse(from.trim()) : null;
            t = to != null && !to.isBlank() ? YearMonth.parse(to.trim()) : null;
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Months must look like 2026-01"));
        }
        return ResponseEntity.ok(Map.of("data", payrollReportService.dataset(f, t)));
    }
}
