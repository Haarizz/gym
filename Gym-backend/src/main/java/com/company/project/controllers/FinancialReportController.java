package com.company.project.controllers;

import com.company.project.services.FinancialReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/financial-reports")
public class FinancialReportController {

    private final FinancialReportService financialReportService;

    public FinancialReportController(FinancialReportService financialReportService) {
        this.financialReportService = financialReportService;
    }

    @GetMapping("/income-statement")
    public ResponseEntity<Map<String, Object>> getIncomeStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = LocalDate.now().withDayOfMonth(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(financialReportService.getIncomeStatement(from, to));
    }

    @GetMapping("/balance-sheet")
    public ResponseEntity<Map<String, Object>> getBalanceSheet(
            @RequestParam(name = "as_of", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        if (asOf == null) asOf = LocalDate.now();
        return ResponseEntity.ok(financialReportService.getBalanceSheet(asOf));
    }

    @GetMapping("/trial-balance")
    public ResponseEntity<Map<String, Object>> getTrialBalance(
            @RequestParam(name = "as_of", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        if (asOf == null) asOf = LocalDate.now();
        return ResponseEntity.ok(financialReportService.getTrialBalance(asOf));
    }

    @GetMapping("/cash-flow")
    public ResponseEntity<Map<String, Object>> getCashFlowStatement(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = LocalDate.now().withDayOfMonth(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(financialReportService.getCashFlowStatement(from, to));
    }
}
