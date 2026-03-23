package com.company.project.controllers;

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
            @RequestBody Map<String, String> body) {
        LocalDate filedDate = body.containsKey("filed_date")
                ? LocalDate.parse(body.get("filed_date")) : null;
        BigDecimal amount = body.containsKey("filing_amount")
                ? new BigDecimal(body.get("filing_amount")) : null;
        String reference = body.get("filing_reference");
        return ResponseEntity.ok(taxComplianceService.markFiled(id, filedDate, amount, reference));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taxComplianceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
