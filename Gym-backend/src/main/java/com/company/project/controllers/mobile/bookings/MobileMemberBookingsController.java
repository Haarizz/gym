package com.company.project.controllers.mobile.bookings;

import com.company.project.dto.mobile.bookings.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.bookings.MobileMemberBookingsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/mobile/member/bookings")
public class MobileMemberBookingsController {

    private final MobileMemberBookingsService bookingsService;

    public MobileMemberBookingsController(MobileMemberBookingsService bookingsService) {
        this.bookingsService = bookingsService;
    }

    @GetMapping
    public ResponseEntity<List<MemberBookingDTO>> getUpcomingBookings(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(bookingsService.getUpcomingBookings(principal));
    }

    @GetMapping("/history")
    public ResponseEntity<List<MemberBookingDTO>> getPastBookings(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(bookingsService.getPastBookings(principal));
    }

    @GetMapping("/stats")
    public ResponseEntity<BookingStatsDTO> getBookingStats(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(bookingsService.getBookingStats(principal));
    }

    @GetMapping("/available-classes")
    public ResponseEntity<List<AvailableClassDTO>> getAvailableClasses(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(bookingsService.getAvailableClasses(principal, date));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<MemberBookingDTO> getBookingDetails(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingsService.getBookingDetails(principal, bookingId));
    }

    @PostMapping
    public ResponseEntity<MemberBookingDTO> createBooking(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody CreateMemberBookingRequestDTO request) {
        return ResponseEntity.ok(bookingsService.createBooking(principal, request));
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<MemberBookingDTO> cancelBooking(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long bookingId) {
        return ResponseEntity.ok(bookingsService.cancelBooking(principal, bookingId));
    }
}
