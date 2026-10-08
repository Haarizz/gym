package com.company.project.controllers;

import com.company.project.dto.RecordBillPaymentRequestDTO;
import com.company.project.dto.SalesInvoiceRequestDTO;
import com.company.project.dto.SalesInvoiceResponseDTO;
import com.company.project.dto.SalesInvoicesPageResponseDTO;
import com.company.project.services.SalesInvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales-invoices")
public class SalesInvoiceController {

    private final SalesInvoiceService salesInvoiceService;

    public SalesInvoiceController(SalesInvoiceService salesInvoiceService) {
        this.salesInvoiceService = salesInvoiceService;
    }

    /**
     * GET /api/sales-invoices?page=1&size=20&status=&search=&source=  (source: MANUAL | POS)
     */
    @GetMapping
    public ResponseEntity<SalesInvoicesPageResponseDTO> getInvoices(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String source) {
        return ResponseEntity.ok(salesInvoiceService.getInvoices(page, size, status, search, source));
    }

    /**
     * GET /api/sales-invoices/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SalesInvoiceResponseDTO> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(salesInvoiceService.getInvoiceById(id));
    }

    /**
     * POST /api/sales-invoices — saves a draft.
     */
    @PostMapping
    public ResponseEntity<SalesInvoiceResponseDTO> createInvoice(@RequestBody SalesInvoiceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salesInvoiceService.createInvoice(request));
    }

    /**
     * PUT /api/sales-invoices/{id} — drafts only.
     */
    @PutMapping("/{id}")
    public ResponseEntity<SalesInvoiceResponseDTO> updateInvoice(@PathVariable Long id,
                                                                 @RequestBody SalesInvoiceRequestDTO request) {
        return ResponseEntity.ok(salesInvoiceService.updateInvoice(id, request));
    }

    /**
     * DELETE /api/sales-invoices/{id} — drafts only.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        salesInvoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/sales-invoices/{id}/confirm — optional body: the payment received now
     * (required in full for walk-in customers).
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<SalesInvoiceResponseDTO> confirmInvoice(@PathVariable Long id,
                                                                  @RequestBody(required = false) RecordBillPaymentRequestDTO payment) {
        return ResponseEntity.ok(salesInvoiceService.confirmInvoice(id, payment));
    }

    /**
     * POST /api/sales-invoices/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<SalesInvoiceResponseDTO> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(salesInvoiceService.cancelInvoice(id));
    }

    /**
     * POST /api/sales-invoices/{id}/record-payment
     */
    @PostMapping("/{id}/record-payment")
    public ResponseEntity<SalesInvoiceResponseDTO> recordPayment(@PathVariable Long id,
                                                                 @RequestBody RecordBillPaymentRequestDTO request) {
        return ResponseEntity.ok(salesInvoiceService.recordPayment(id, request));
    }
}
