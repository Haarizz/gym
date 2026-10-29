package com.company.project.controllers;

import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.dto.TaxComplianceRequestDTO;
import com.company.project.dto.TaxComplianceResponseDTO;
import com.company.project.services.TaxComplianceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tax-compliance")
public class TaxComplianceController {

    private final TaxComplianceService taxComplianceService;

    public TaxComplianceController(TaxComplianceService taxComplianceService) {
        this.taxComplianceService = taxComplianceService;
    }

    @GetMapping
    public ResponseEntity<List<TaxComplianceResponseDTO>> getAll(
            @RequestParam(name = "tax_type", required = false) String taxType,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(taxComplianceService.getAll(taxType, status));
    }

    @PostMapping
    public ResponseEntity<TaxComplianceResponseDTO> create(
            @RequestBody TaxComplianceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taxComplianceService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaxComplianceResponseDTO> update(
            @PathVariable Long id,
            @RequestBody TaxComplianceRequestDTO request) {
        return ResponseEntity.ok(taxComplianceService.update(id, request));
    }

    @PostMapping("/{id}/mark-filed")
    public ResponseEntity<TaxComplianceResponseDTO> markFiled(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String filed = text(body.get("filed_date"));
        String amountText = text(body.get("filing_amount"));
        LocalDate filedDate;
        BigDecimal amount;
        try {
            filedDate = filed != null ? LocalDate.parse(filed) : null;
            amount = amountText != null ? new BigDecimal(amountText) : null;
        } catch (RuntimeException e) {
            throw new BusinessRuleViolationException("Check the filed date and amount");
        }
        String reference = text(body.get("filing_reference"));
        return ResponseEntity.ok(taxComplianceService.markFiled(id, filedDate, amount, reference));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taxComplianceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private static String text(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? null : s;
    }
}
