package com.company.project.controllers;

import com.company.project.dto.BankReconciliationRequestDTO;
import com.company.project.dto.BankReconciliationResponseDTO;
import com.company.project.services.BankReconciliationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank-reconciliations")
public class BankReconciliationController {

    private final BankReconciliationService bankReconciliationService;

    public BankReconciliationController(BankReconciliationService bankReconciliationService) {
        this.bankReconciliationService = bankReconciliationService;
    }

    @GetMapping
    public ResponseEntity<List<BankReconciliationResponseDTO>> getAll(
            @RequestParam(name = "bank_account", required = false) String bankAccountName) {
        return ResponseEntity.ok(bankReconciliationService.getAll(bankAccountName));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankReconciliationResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bankReconciliationService.getById(id));
    }

    @PostMapping
    public ResponseEntity<BankReconciliationResponseDTO> create(
            @RequestBody BankReconciliationRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bankReconciliationService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankReconciliationResponseDTO> update(
            @PathVariable Long id,
            @RequestBody BankReconciliationRequestDTO request) {
        return ResponseEntity.ok(bankReconciliationService.update(id, request));
    }

    @PostMapping("/{id}/lines/{lineId}/match")
    public ResponseEntity<BankReconciliationResponseDTO> matchLine(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(bankReconciliationService.matchLine(id, lineId, body.get("voucher_no")));
    }

    @PostMapping("/{id}/lines/{lineId}/unmatch")
    public ResponseEntity<BankReconciliationResponseDTO> unmatchLine(
            @PathVariable Long id,
            @PathVariable Long lineId) {
        return ResponseEntity.ok(bankReconciliationService.unmatchLine(id, lineId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<BankReconciliationResponseDTO> complete(@PathVariable Long id) {
        return ResponseEntity.ok(bankReconciliationService.complete(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bankReconciliationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
