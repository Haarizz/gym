package com.company.project.controllers;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.services.BookingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

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

    @PostMapping
    public ResponseEntity<BookingResponseDTO> createBooking(@RequestBody BookingRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BookingResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody BookingStatusUpdateDTO request) {
        return ResponseEntity.ok(bookingService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }
}
