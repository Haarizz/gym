package com.company.project.controllers;

import com.company.project.dto.ReceiptVoucherRequestDTO;
import com.company.project.dto.ReceiptVoucherResponseDTO;
import com.company.project.services.ReceiptVoucherService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/receipt-vouchers")
public class ReceiptVoucherController {

    private final ReceiptVoucherService receiptVoucherService;

    public ReceiptVoucherController(ReceiptVoucherService receiptVoucherService) {
        this.receiptVoucherService = receiptVoucherService;
    }

    @GetMapping
    public ResponseEntity<List<ReceiptVoucherResponseDTO>> getReceiptVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String branch,
            @RequestParam(name = "source_category", required = false) String sourceCategory,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(
                receiptVoucherService.getReceiptVouchers(search, status, branch, sourceCategory, from, to));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReceiptVoucherResponseDTO> getReceiptVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(receiptVoucherService.getReceiptVoucherById(id));
    }

    @PostMapping
    public ResponseEntity<ReceiptVoucherResponseDTO> createReceiptVoucher(
            @RequestBody ReceiptVoucherRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(receiptVoucherService.createReceiptVoucher(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReceiptVoucherResponseDTO> updateReceiptVoucher(
            @PathVariable Long id,
            @RequestBody ReceiptVoucherRequestDTO request) {
        return ResponseEntity.ok(receiptVoucherService.updateReceiptVoucher(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ReceiptVoucherResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(receiptVoucherService.updateStatus(id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReceiptVoucher(@PathVariable Long id) {
        receiptVoucherService.deleteReceiptVoucher(id);
        return ResponseEntity.noContent().build();
    }
}
