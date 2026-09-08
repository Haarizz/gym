package com.company.project.controllers;

import com.company.project.dto.LedgerTransactionsPageResponseDTO;
import com.company.project.services.LedgerTransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ledger-transactions")
public class LedgerTransactionController {

    private final LedgerTransactionService ledgerTransactionService;

    public LedgerTransactionController(LedgerTransactionService ledgerTransactionService) {
        this.ledgerTransactionService = ledgerTransactionService;
    }

    @GetMapping
    public ResponseEntity<LedgerTransactionsPageResponseDTO> getTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "25") int limit) {
        return ResponseEntity.ok(ledgerTransactionService.getTransactionsPage(from, to, type, search, page, limit));
    }
}
