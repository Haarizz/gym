package com.company.project.controllers;

import com.company.project.dto.BillingStatsDTO;
import com.company.project.dto.MemberDueDTO;
import com.company.project.dto.MemberStatementResponseDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.services.ReceiptService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final ReceiptService receiptService;

    public BillingController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    /**
     * GET /api/billing/stats
     * Dashboard summary: monthly collection, overdue, due soon, collection rate, charts.
     */
    @GetMapping("/stats")
    public ResponseEntity<BillingStatsDTO> getStats() {
        return ResponseEntity.ok(receiptService.getBillingStats());
    }

    /**
     * GET /api/billing/dues
     * List of members with overdue or upcoming payments (Member Due tab).
     */
    @GetMapping("/dues")
    public ResponseEntity<List<MemberDueDTO>> getMemberDues() {
        return ResponseEntity.ok(receiptService.getMemberDues());
    }

    /**
     * GET /api/billing/member/{memberDbId}/pending-bills
     * Pending/partial receipt bills for a specific member (used by create-receipt page).
     */
    @GetMapping("/member/{memberDbId}/pending-bills")
    public ResponseEntity<List<ReceiptResponseDTO>> getPendingBills(@PathVariable Long memberDbId) {
        return ResponseEntity.ok(receiptService.getPendingBillsForMember(memberDbId));
    }

    /**
     * POST /api/billing/settle
     * Apply payment to one or more pending bills, update member balance, create settlement receipt.
     */
    @PostMapping("/settle")
    public ResponseEntity<ReceiptResponseDTO> settlePayment(@RequestBody SettlePaymentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(receiptService.settlePayment(request));
    }

    /**
     * GET /api/billing/member/{memberDbId}/statement?from=&to=
     * Full Statement of Account for one member (Member SOA tab) — every receipt
     * billed/paid against them with a running balance. Minors always come back
     * with an empty statement since their charges are billed to their guardian.
     */
    @GetMapping("/member/{memberDbId}/statement")
    public ResponseEntity<MemberStatementResponseDTO> getMemberStatement(
            @PathVariable Long memberDbId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(receiptService.getMemberStatement(
                memberDbId,
                from != null ? from.atStartOfDay() : null,
                to != null ? to.atTime(java.time.LocalTime.MAX) : null));
    }
}
