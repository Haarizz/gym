package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.CashMovementDTO;
import com.company.project.dto.pos.PosResponses.SessionDTO;
import com.company.project.dto.pos.PosResponses.SessionsPage;
import com.company.project.dto.pos.PosResponses.TransactionsPage;
import com.company.project.dto.pos.PosResponses.XReport;
import com.company.project.services.pos.PosReportService;
import com.company.project.services.pos.PosSalesService;
import com.company.project.services.pos.PosTillService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** POS sessions (one per cashier), their cash movements and X-report. */
@RestController
@RequestMapping("/api/pos/sessions")
public class PosSessionController {

    private final PosTillService tillService;
    private final PosReportService reportService;
    private final PosSalesService salesService;

    public PosSessionController(PosTillService tillService, PosReportService reportService, PosSalesService salesService) {
        this.tillService = tillService;
        this.reportService = reportService;
        this.salesService = salesService;
    }

    /** GET /api/pos/sessions?from=&to=&status=&cashier=&page=1&size=20 — session history. */
    @GetMapping
    public ResponseEntity<SessionsPage> getSessions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cashier,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(tillService.history(from, to, status, cashier, page, size));
    }

    /** GET /api/pos/sessions/active — the caller's open session; 404 when they have none. */
    @GetMapping("/active")
    public ResponseEntity<SessionDTO> getActiveSession() {
        return tillService.active().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** GET /api/pos/sessions/live — every open session of the branch. */
    @GetMapping("/live")
    public ResponseEntity<List<SessionDTO>> getLiveSessions() {
        return ResponseEntity.ok(tillService.live());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDTO> getSessionById(@PathVariable Long id) {
        return ResponseEntity.ok(tillService.get(id));
    }

    @PostMapping
    public ResponseEntity<SessionDTO> openSession(@RequestBody PosRequests.OpenSession request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tillService.open(request));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<SessionDTO> closeSession(@PathVariable Long id, @RequestBody PosRequests.CloseSession request) {
        return ResponseEntity.ok(tillService.close(id, request));
    }

    @GetMapping("/{id}/x-report")
    public ResponseEntity<XReport> getXReport(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.xReport(id));
    }

    /** POST /api/pos/sessions/{id}/x-report/printed — counts X-report prints for the audit trail. */
    @PostMapping("/{id}/x-report/printed")
    public ResponseEntity<SessionDTO> markXReportPrinted(@PathVariable Long id) {
        return ResponseEntity.ok(tillService.recordXReportPrint(id));
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<TransactionsPage> getSessionTransactions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        tillService.get(id);
        return ResponseEntity.ok(salesService.list(new PosSalesService.Filter(null, null, null, id, null, null, null, null, null), page, size));
    }

    @GetMapping("/{id}/cash-movements")
    public ResponseEntity<List<CashMovementDTO>> getCashMovements(@PathVariable Long id) {
        return ResponseEntity.ok(tillService.cashMovements(id));
    }

    @PostMapping("/{id}/cash-movements")
    public ResponseEntity<CashMovementDTO> addCashMovement(@PathVariable Long id, @RequestBody PosRequests.CashMovement request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tillService.addCashMovement(id, request));
    }
}
