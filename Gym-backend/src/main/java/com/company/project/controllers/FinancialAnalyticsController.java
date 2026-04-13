package com.company.project.controllers;

import com.company.project.dto.LedgerTransactionDTO;
import com.company.project.services.FinancialAnalyticsService;
import com.company.project.services.LedgerTransactionService;
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
    private final LedgerTransactionService  ledgerTransactionService;

    public FinancialAnalyticsController(FinancialAnalyticsService financialAnalyticsService,
                                         LedgerTransactionService ledgerTransactionService) {
        this.financialAnalyticsService = financialAnalyticsService;
        this.ledgerTransactionService  = ledgerTransactionService;
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

    @GetMapping("/transactions")
    public ResponseEntity<List<LedgerTransactionDTO>> getTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ledgerTransactionService.getTransactions(from, to, type, search));
    }
}
