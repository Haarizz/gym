package com.company.project.controllers;

import com.company.project.dto.AutoMatchSuggestionDTO;
import com.company.project.dto.BankReconciliationRequestDTO;
import com.company.project.dto.BankReconciliationResponseDTO;
import com.company.project.dto.MatchCandidateDTO;
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
            @RequestBody Map<String, Object> body) {
        Object raw = body.get("journal_voucher_id");
        Long journalVoucherId = raw != null ? Long.valueOf(String.valueOf(raw)) : null;
        return ResponseEntity.ok(bankReconciliationService.matchLine(id, lineId, journalVoucherId));
    }

    @PostMapping("/{id}/lines/{lineId}/unmatch")
    public ResponseEntity<BankReconciliationResponseDTO> unmatchLine(
            @PathVariable Long id,
            @PathVariable Long lineId) {
        return ResponseEntity.ok(bankReconciliationService.unmatchLine(id, lineId));
    }

    /** Real, unmatched, posted vouchers on the bank account that could match this line — for the manual match picker. */
    @GetMapping("/{id}/lines/{lineId}/candidates")
    public ResponseEntity<List<MatchCandidateDTO>> getMatchCandidates(
            @PathVariable Long id,
            @PathVariable Long lineId) {
        return ResponseEntity.ok(bankReconciliationService.getMatchCandidates(id, lineId));
    }

    /** Read-only auto-match suggestions for every unmatched line — nothing is applied until the caller confirms via match(). */
    @GetMapping("/{id}/auto-match")
    public ResponseEntity<List<AutoMatchSuggestionDTO>> suggestAutoMatches(@PathVariable Long id) {
        return ResponseEntity.ok(bankReconciliationService.suggestAutoMatches(id));
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
