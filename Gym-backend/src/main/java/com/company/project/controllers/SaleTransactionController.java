package com.company.project.controllers;

import com.company.project.dto.SaleTransactionPageResponseDTO;
import com.company.project.dto.SaleTransactionRequestDTO;
import com.company.project.dto.SaleTransactionResponseDTO;
import com.company.project.services.SaleTransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pos/transactions")
public class SaleTransactionController {

    private final SaleTransactionService saleTransactionService;

    public SaleTransactionController(SaleTransactionService saleTransactionService) {
        this.saleTransactionService = saleTransactionService;
    }

    /**
     * GET /api/pos/transactions?search=&paymentMethod=&status=&sessionId=&page=1&size=20
     */
    @GetMapping
    public ResponseEntity<SaleTransactionPageResponseDTO> getTransactions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                saleTransactionService.getTransactions(search, paymentMethod, status, sessionId, page, size)
        );
    }

    /**
     * GET /api/pos/transactions/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SaleTransactionResponseDTO> getTransactionById(@PathVariable Long id) {
        return ResponseEntity.ok(saleTransactionService.getTransactionById(id));
    }

    /**
     * POST /api/pos/transactions
     */
    @PostMapping
    public ResponseEntity<SaleTransactionResponseDTO> createTransaction(@RequestBody SaleTransactionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(saleTransactionService.createTransaction(request));
    }

    /**
     * POST /api/pos/transactions/{id}/refund
     */
    @PostMapping("/{id}/refund")
    public ResponseEntity<SaleTransactionResponseDTO> refundTransaction(@PathVariable Long id) {
        return ResponseEntity.ok(saleTransactionService.refundTransaction(id));
    }
}
