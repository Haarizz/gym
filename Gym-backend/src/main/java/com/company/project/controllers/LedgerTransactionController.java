package com.company.project.controllers;

import com.company.project.dto.LedgerTransactionDTO;
import com.company.project.services.LedgerTransactionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ledger-transactions")
public class LedgerTransactionController {

    private final LedgerTransactionService ledgerTransactionService;

    public LedgerTransactionController(LedgerTransactionService ledgerTransactionService) {
        this.ledgerTransactionService = ledgerTransactionService;
    }

    @GetMapping
    public ResponseEntity<List<LedgerTransactionDTO>> getTransactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ledgerTransactionService.getTransactions(from, to, type, search));
    }
}
