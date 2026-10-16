package com.company.project.controllers;

import com.company.project.dto.SalaryAdvanceApprovalRequestDTO;
import com.company.project.dto.SalaryAdvanceRequestDTO;
import com.company.project.dto.SalaryAdvanceResponseDTO;
import com.company.project.services.AdvancesDeductionsService;
import com.company.project.services.SalaryAdvanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salary-advances")
public class SalaryAdvanceController {

    private final SalaryAdvanceService salaryAdvanceService;
    private final AdvancesDeductionsService advancesDeductionsService;

    public SalaryAdvanceController(SalaryAdvanceService salaryAdvanceService,
                                   AdvancesDeductionsService advancesDeductionsService) {
        this.salaryAdvanceService = salaryAdvanceService;
        this.advancesDeductionsService = advancesDeductionsService;
    }

    @GetMapping
    public ResponseEntity<List<SalaryAdvanceResponseDTO>> getAdvances(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(salaryAdvanceService.getAdvances(search, status, department));
    }

    @PostMapping
    public ResponseEntity<SalaryAdvanceResponseDTO> createAdvance(
            @RequestBody SalaryAdvanceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryAdvanceService.createAdvance(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SalaryAdvanceResponseDTO> updateAdvance(
            @PathVariable Long id,
            @RequestBody SalaryAdvanceRequestDTO request) {
        return ResponseEntity.ok(salaryAdvanceService.updateAdvance(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<SalaryAdvanceResponseDTO> approveAdvance(
            @PathVariable Long id,
            @RequestBody SalaryAdvanceApprovalRequestDTO request) {
        return ResponseEntity.ok(salaryAdvanceService.approveAdvance(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAdvance(@PathVariable Long id) {
        salaryAdvanceService.deleteAdvance(id);
        return ResponseEntity.noContent().build();
    }

    /** Installment schedule of every repaying / repaid advance (or one advance with advance_id). */
    @GetMapping("/schedule")
    public List<Map<String, Object>> schedule(@RequestParam(name = "advance_id", required = false) Long advanceId) {
        return advancesDeductionsService.schedule(advanceId);
    }

    /** Advances issued, installments recovered and payroll deductions taken. */
    @GetMapping("/transactions")
    public List<Map<String, Object>> transactions() {
        return advancesDeductionsService.transactions();
    }

    /** Body: { period_month: yyyy-MM-dd, amount?, note? } — records an installment repaid directly. */
    @PostMapping("/{id}/repayments")
    public ResponseEntity<Void> recordRepayment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object amount = body.get("amount");
        Object month = body.get("period_month");
        Object note = body.get("note");
        advancesDeductionsService.recordRepayment(id,
                month != null && !String.valueOf(month).isBlank() ? LocalDate.parse(String.valueOf(month).substring(0, 10)) : null,
                amount != null && !String.valueOf(amount).isBlank() ? new BigDecimal(String.valueOf(amount)) : null,
                "manual", null, note != null ? String.valueOf(note) : null);
        return ResponseEntity.noContent().build();
    }

    /** Body: { period_month: yyyy-MM-dd, note? } — skips that month's installment. */
    @PostMapping("/{id}/skip")
    public ResponseEntity<Void> skip(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object month = body.get("period_month");
        Object note = body.get("note");
        advancesDeductionsService.skipInstallment(id,
                month != null && !String.valueOf(month).isBlank() ? LocalDate.parse(String.valueOf(month).substring(0, 10)) : null,
                note != null ? String.valueOf(note) : null);
        return ResponseEntity.noContent().build();
    }
}
