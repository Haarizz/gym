package com.company.project.controllers;

import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SupplierBillRequestDTO;
import com.company.project.dto.SupplierBillResponseDTO;
import com.company.project.dto.SupplierBillsPageResponseDTO;
import com.company.project.services.SupplierBillService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/supplier-bills")
public class SupplierBillController {

    private final SupplierBillService supplierBillService;

    public SupplierBillController(SupplierBillService supplierBillService) {
        this.supplierBillService = supplierBillService;
    }

    /**
     * GET /api/supplier-bills?page=1&size=20&status=&search=
     */
    @GetMapping
    public ResponseEntity<SupplierBillsPageResponseDTO> getBills(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(supplierBillService.getBills(page, size, status, search));
    }

    /**
     * GET /api/supplier-bills/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SupplierBillResponseDTO> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierBillService.getBillById(id));
    }

    /**
     * POST /api/supplier-bills
     */
    @PostMapping
    public ResponseEntity<SupplierBillResponseDTO> createBill(@RequestBody SupplierBillRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierBillService.createBill(request));
    }

    /**
     * PUT /api/supplier-bills/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<SupplierBillResponseDTO> updateBill(
            @PathVariable Long id,
            @RequestBody SupplierBillRequestDTO request) {
        return ResponseEntity.ok(supplierBillService.updateBill(id, request));
    }

    /**
     * DELETE /api/supplier-bills/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long id) {
        supplierBillService.deleteBill(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/supplier-bills/{id}/confirm
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<SupplierBillResponseDTO> confirmBill(@PathVariable Long id) {
        return ResponseEntity.ok(supplierBillService.confirmBill(id));
    }

    /**
     * POST /api/supplier-bills/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<SupplierBillResponseDTO> cancelBill(@PathVariable Long id) {
        return ResponseEntity.ok(supplierBillService.cancelBill(id));
    }

    /**
     * POST /api/supplier-bills/{id}/record-payment
     */
    @PostMapping("/{id}/record-payment")
    public ResponseEntity<SupplierBillResponseDTO> recordPayment(
            @PathVariable Long id,
            @RequestBody RecordBillPaymentRequestDTO request) {
        return ResponseEntity.ok(supplierBillService.recordPayment(id, request));
    }
}
