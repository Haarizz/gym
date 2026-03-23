package com.company.project.controllers;

import com.company.project.dto.PaymentVoucherRequestDTO;
import com.company.project.dto.PaymentVoucherResponseDTO;
import com.company.project.services.PaymentVoucherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment-vouchers")
public class PaymentVoucherController {

    private final PaymentVoucherService paymentVoucherService;

    public PaymentVoucherController(PaymentVoucherService paymentVoucherService) {
        this.paymentVoucherService = paymentVoucherService;
    }

    @GetMapping
    public ResponseEntity<List<PaymentVoucherResponseDTO>> getPaymentVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(name = "supplier_type", required = false) String supplierType) {
        return ResponseEntity.ok(paymentVoucherService.getPaymentVouchers(search, status, supplierType));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentVoucherResponseDTO> getPaymentVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(paymentVoucherService.getPaymentVoucherById(id));
    }

    @PostMapping
    public ResponseEntity<PaymentVoucherResponseDTO> createPaymentVoucher(
            @RequestBody PaymentVoucherRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentVoucherService.createPaymentVoucher(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PaymentVoucherResponseDTO> updatePaymentVoucher(
            @PathVariable Long id,
            @RequestBody PaymentVoucherRequestDTO request) {
        return ResponseEntity.ok(paymentVoucherService.updatePaymentVoucher(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PaymentVoucherResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(paymentVoucherService.updateStatus(id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePaymentVoucher(@PathVariable Long id) {
        paymentVoucherService.deletePaymentVoucher(id);
        return ResponseEntity.noContent().build();
    }
}
