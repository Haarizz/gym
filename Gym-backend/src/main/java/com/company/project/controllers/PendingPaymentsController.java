package com.company.project.controllers;

import com.company.project.dto.PendingPaymentDTOs.*;
import com.company.project.dto.WriteOffRequestDTO;
import com.company.project.services.PendingPaymentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Billing › Pending Payments. Under /api/billing so ModulePermissionRules' Billing rule gates it:
 * reads need a Billing / finance view permission, a write-off needs Billing, Payments or Members
 * create/edit. Branch scoping comes from the active branch (Hibernate branch filter).
 */
@RestController
@RequestMapping("/api/billing/pending-payments")
public class PendingPaymentsController {

    private final PendingPaymentService service;

    public PendingPaymentsController(PendingPaymentService service) {
        this.service = service;
    }

    /** Open dues. filter: all | overdue | upcoming; sort: due_date | amount; dir: asc | desc. */
    @GetMapping
    public ResponseEntity<DuePage> list(@RequestParam(required = false) String search,
                                        @RequestParam(defaultValue = "all") String filter,
                                        @RequestParam(defaultValue = "due_date") String sort,
                                        @RequestParam(defaultValue = "asc") String dir,
                                        @RequestParam(defaultValue = "1") int page,
                                        @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(service.list(search, filter, sort, dir, page, limit));
    }

    /** Header cards; the written-off figures cover from..to (both optional, inclusive). */
    @GetMapping("/stats")
    public ResponseEntity<Stats> stats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.stats(from, to));
    }

    /** Writes off what is still owed on one bill (receipt). Not a payment: no receipt is created. */
    @PostMapping("/{receiptId}/write-off")
    public ResponseEntity<WriteOff> writeOff(@PathVariable Long receiptId, @RequestBody WriteOffRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.writeOff(receiptId, request));
    }

    @GetMapping("/write-offs")
    public ResponseEntity<WriteOffPage> history(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false, name = "written_by") String writtenBy,
            @RequestParam(defaultValue = "date") String sort,
            @RequestParam(defaultValue = "desc") String dir,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(service.history(search, from, to, reason, writtenBy, sort, dir, page, limit));
    }

    @GetMapping("/write-offs/report")
    public ResponseEntity<Report> report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.report(from, to));
    }
}
