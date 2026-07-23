package com.company.project.controllers;

import com.company.project.dto.AccountHeadRequestDTO;
import com.company.project.dto.AccountHeadResponseDTO;
import com.company.project.dto.LedgerEntryDTO;
import com.company.project.services.AccountHeadService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/account-heads")
public class AccountHeadController {

    private final AccountHeadService accountHeadService;

    public AccountHeadController(AccountHeadService accountHeadService) {
        this.accountHeadService = accountHeadService;
    }

    @GetMapping
    public ResponseEntity<List<AccountHeadResponseDTO>> getAccountHeads(
            @RequestParam(required = false) String type,
            @RequestParam(name = "is_active", required = false) Boolean isActive,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(accountHeadService.getAccountHeads(type, isActive, search));
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<LedgerEntryDTO>> getAllLedgerEntries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(accountHeadService.getAllLedgerEntries(from, to));
    }

    @GetMapping("/{code}/ledger")
    public ResponseEntity<List<LedgerEntryDTO>> getLedgerEntries(
            @PathVariable String code,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(accountHeadService.getLedgerEntries(code, from, to));
    }

    @PostMapping
    public ResponseEntity<AccountHeadResponseDTO> createAccountHead(
            @RequestBody AccountHeadRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountHeadService.createAccountHead(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountHeadResponseDTO> updateAccountHead(
            @PathVariable Long id,
            @RequestBody AccountHeadRequestDTO request) {
        return ResponseEntity.ok(accountHeadService.updateAccountHead(id, request));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<AccountHeadResponseDTO> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(accountHeadService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccountHead(@PathVariable Long id) {
        accountHeadService.deleteAccountHead(id);
        return ResponseEntity.noContent().build();
    }
}
