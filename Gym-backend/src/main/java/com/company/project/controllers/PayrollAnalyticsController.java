package com.company.project.controllers;

import com.company.project.dto.payroll.PayrollDashboardDTO;
import com.company.project.services.PayrollAnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll-analytics")
public class PayrollAnalyticsController {

    private final PayrollAnalyticsService payrollAnalyticsService;

    public PayrollAnalyticsController(PayrollAnalyticsService payrollAnalyticsService) {
        this.payrollAnalyticsService = payrollAnalyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        return ResponseEntity.ok(Map.of("data", payrollAnalyticsService.getDashboardData()));
    }
}
