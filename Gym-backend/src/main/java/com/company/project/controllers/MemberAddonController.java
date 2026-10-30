package com.company.project.controllers;

import com.company.project.dto.MemberAddonPageResponseDTO;
import com.company.project.dto.MemberAddonRequestDTO;
import com.company.project.dto.MemberAddonResponseDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberAddonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/member-addons")
public class MemberAddonController {

    private final MemberAddonService memberAddonService;

    public MemberAddonController(MemberAddonService memberAddonService) {
        this.memberAddonService = memberAddonService;
    }

    /**
     * GET /api/member-addons?page=1&limit=100&search=&status=
     * Returns paginated list: { addons: [...], pagination: {...} }
     */
    @GetMapping
    public ResponseEntity<MemberAddonPageResponseDTO> getAddons(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1")   int page,
            @RequestParam(defaultValue = "100") int limit) {

        return ResponseEntity.ok(
                memberAddonService.getAddons(search, status, page, limit)
        );
    }

    /**
     * GET /api/member-addons/pending-approvals
     * Add-ons members bought in the app with Cash/Credit/Mixed, awaiting reception
     * approval — backs the Add-on Payments section of the web Approvals page.
     */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @GetMapping("/pending-approvals")
    public ResponseEntity<List<MemberAddonResponseDTO>> getPendingPaymentApprovals() {
        return ResponseEntity.ok(memberAddonService.getPendingPaymentApprovals());
    }

    /** POST /api/member-addons/{id}/approve-payment — activates the add-on and posts the payment. */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @PostMapping("/{id}/approve-payment")
    public ResponseEntity<MemberAddonResponseDTO> approvePayment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String approvedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(memberAddonService.approvePayment(id, approvedBy));
    }

    /**
     * POST /api/member-addons/{id}/reject-payment
     * Body: { "reason": "..." } — the add-on never starts and any wallet amount is returned.
     */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @PostMapping("/{id}/reject-payment")
    public ResponseEntity<?> rejectPayment(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String reason = body != null ? body.get("reason") : null;
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body("A rejection reason is required");
        }
        String rejectedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(memberAddonService.rejectPayment(id, rejectedBy, reason));
    }

    /**
     * GET /api/member-addons/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberAddonResponseDTO> getAddonById(@PathVariable Long id) {
        return ResponseEntity.ok(memberAddonService.getAddonById(id));
    }

    /**
     * GET /api/member-addons/{id}/receipt — the receipt the purchase generated.
     */
    @GetMapping("/{id}/receipt")
    public ResponseEntity<ReceiptResponseDTO> getAddonReceipt(@PathVariable Long id) {
        return ResponseEntity.ok(memberAddonService.getAddonReceipt(id));
    }

    /**
     * POST /api/member-addons
     */
    @PostMapping
    public ResponseEntity<MemberAddonResponseDTO> createAddon(@RequestBody MemberAddonRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberAddonService.createAddon(request));
    }

    /**
     * PUT /api/member-addons/{id}/status?status=Cancelled
     * Cancelling refunds what was paid to the member's wallet.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<MemberAddonResponseDTO> updateAddonStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String changedBy = principal != null ? principal.getUsername() : "Staff";
        return ResponseEntity.ok(memberAddonService.updateAddonStatus(id, status, changedBy));
    }

    /**
     * DELETE /api/member-addons/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddon(@PathVariable Long id) {
        memberAddonService.deleteAddon(id);
        return ResponseEntity.noContent().build();
    }
}
