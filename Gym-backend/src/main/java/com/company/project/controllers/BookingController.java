package com.company.project.controllers;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.services.BookingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.company.project.security.UserDetailsImpl;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    // Members book and cancel through /api/mobile/member/bookings, which applies the
    // refund window; these staff routes refund in full, so member tokens can't use them.
    private static final String NOT_A_MEMBER =
            "!(principal instanceof T(com.company.project.security.UserDetailsImpl) and principal.global)";

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    public ResponseEntity<List<BookingResponseDTO>> getBookings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long memberId) {
        return ResponseEntity.ok(bookingService.getBookings(status, type, startDate, endDate, search, memberId));
    }

    @PreAuthorize(NOT_A_MEMBER)
    @PostMapping
    public ResponseEntity<BookingResponseDTO> createBooking(@RequestBody BookingRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(request));
    }

    @PreAuthorize(NOT_A_MEMBER)
    @PatchMapping("/{id}/status")
    public ResponseEntity<BookingResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody BookingStatusUpdateDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        // Staff cancellations refund in full; a caller who is only a MEMBER gets the
        // member rule (no refund inside the cutoff) instead.
        String cancelledBy = isOnlyMember(principal)
                ? com.company.project.services.BookingPaymentService.CANCELLED_BY_MEMBER
                : com.company.project.services.BookingPaymentService.CANCELLED_BY_STAFF;
        return ResponseEntity.ok(bookingService.updateStatus(id, request, cancelledBy,
                com.company.project.services.BookingPaymentService.REFUND_METHOD_WALLET));
    }

    private static boolean isOnlyMember(UserDetailsImpl principal) {
        if (principal == null) return false;
        List<String> roles = principal.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .toList();
        return !roles.isEmpty() && roles.stream().allMatch("ROLE_MEMBER"::equals);
    }

    @PreAuthorize(NOT_A_MEMBER)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/bookings/pending-approvals
     * Bookings paid by Cash/Credit/Mixed in the app, awaiting reception approval — backs
     * the Booking Payments section of the web Approvals page.
     */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @GetMapping("/pending-approvals")
    public ResponseEntity<List<BookingResponseDTO>> getPendingPaymentApprovals() {
        return ResponseEntity.ok(bookingService.getPendingPaymentApprovals());
    }

    /** POST /api/bookings/{id}/approve-payment — confirms the seat and posts the payment. */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @PostMapping("/{id}/approve-payment")
    public ResponseEntity<BookingResponseDTO> approvePayment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String approvedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(bookingService.approvePayment(id, approvedBy));
    }

    /**
     * POST /api/bookings/{id}/reject-payment
     * Body: { "reason": "..." } — cancels the booking, frees the seat and returns any
     * wallet amount / Reward Pass.
     */
    @PreAuthorize("hasAuthority('MEMBERS_APPROVE')")
    @PostMapping("/{id}/reject-payment")
    public ResponseEntity<?> rejectPayment(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String reason = body != null ? body.get("reason") : null;
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body("A rejection reason is required");
        }
        String rejectedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(bookingService.rejectPayment(id, rejectedBy, reason));
    }
}
