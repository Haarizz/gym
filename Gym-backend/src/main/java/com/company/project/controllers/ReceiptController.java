package com.company.project.controllers;

import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.ReceiptsPageResponseDTO;
import com.company.project.entities.Receipt;
import com.company.project.services.ReceiptService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    /**
     * GET /api/receipts?page=1&limit=20&search=&transaction_type=&status=
     * Returns paginated list: { receipts: [...], pagination: {...} }
     */
    @GetMapping
    public ResponseEntity<ReceiptsPageResponseDTO> getReceipts(
            @RequestParam(required = false) String search,
            @RequestParam(name = "transaction_type", required = false) String transactionType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(
                receiptService.getReceipts(search, transactionType, status, page, limit)
        );
    }

    /**
     * GET /api/receipts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReceiptResponseDTO> getReceiptById(@PathVariable Long id) {
        return ResponseEntity.ok(receiptService.getReceiptById(id));
    }

    /**
     * POST /api/receipts
     */
    @PostMapping
    public ResponseEntity<ReceiptResponseDTO> createReceipt(@RequestBody Receipt receipt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(receiptService.createReceipt(receipt));
    }
}
