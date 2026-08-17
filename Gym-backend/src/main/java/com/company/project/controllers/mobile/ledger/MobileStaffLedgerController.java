package com.company.project.controllers.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.ledger.MobileStaffLedgerService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/mobile/staff/ledger")
public class MobileStaffLedgerController {

    private final MobileStaffLedgerService ledgerService;

    public MobileStaffLedgerController(MobileStaffLedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    /**
     * GET /api/mobile/staff/ledger
     * Returns the aggregated ledger dataset required by GymBios-Mobile Staff Ledger screen.
     * Automatically scopes identity, payroll, and earnings to the authenticated staff member.
     */
    @GetMapping
    public ResponseEntity<StaffLedgerResponseDTO> getStaffLedger(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(ledgerService.getStaffLedger(principal));
    }

    /**
     * GET /api/mobile/staff/ledger/salary-slip
     * Securely downloads/retrieves the salary slip advice for the authenticated staff member and pay period.
     */
    @GetMapping("/salary-slip")
    public ResponseEntity<byte[]> getSalarySlip(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        int targetYear = year != null ? year : LocalDate.now().getYear();
        int targetMonth = month != null ? month : LocalDate.now().getMonthValue();

        byte[] payslipBytes = ledgerService.getSalarySlip(principal, targetYear, targetMonth);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"salary-slip-" + targetYear + "-" + targetMonth + ".txt\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(payslipBytes);
    }

    /**
     * GET /api/mobile/staff/ledger/tax-documents/{documentId}
     * Securely downloads/retrieves the tax compliance statement for the authenticated staff member.
     */
    @GetMapping("/tax-documents/{documentId}")
    public ResponseEntity<byte[]> getTaxDocument(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable String documentId) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        byte[] docBytes = ledgerService.getTaxDocument(principal, documentId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tax-statement-" + documentId + ".txt\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(docBytes);
    }
}
