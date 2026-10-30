package com.company.project.controllers;

import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.ReceiptsPageResponseDTO;
import com.company.project.entities.Receipt;
import com.company.project.services.ReceiptService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    /**
     * GET /api/receipts?page=1&limit=20&search=&transaction_type=&status=&from=&to=
     * Returns paginated list, newest transaction first: { receipts: [...], pagination: {...} }
     * from (inclusive) / to (exclusive) are UTC date-times on transaction_date, so a
     * client can ask for "today" or "this month" in its own time zone.
     */
    @GetMapping
    public ResponseEntity<ReceiptsPageResponseDTO> getReceipts(
            @RequestParam(required = false) String search,
            @RequestParam(name = "transaction_type", required = false) String transactionType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(
                receiptService.getReceipts(search, transactionType, status, from, to, page, limit)
        );
    }

    /**
     * GET /api/receipts/summary?search=&transaction_type=&from=&to=
     * Counts per status plus money received / still due, for the same filters as
     * the list — lets a paged list show whole-result stat cards without
     * downloading every receipt.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) String search,
            @RequestParam(name = "transaction_type", required = false) String transactionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(receiptService.getSummary(search, transactionType, from, to));
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
