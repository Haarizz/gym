package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.services.pos.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Point of Sale back-office endpoints: Z-report & day close, analytics, held sales,
 * POS credit settlement, returns, printers, settings and the POS audit trail.
 * Configuration writes need POINT_OF_SALE_EDIT; everything a cashier does at the
 * terminal is open to any authenticated POS user, with supervisor approvals
 * enforced per action by the services.
 */
@RestController
@RequestMapping("/api/pos")
public class PosOperationsController {

    private final PosReportService reportService;
    private final PosDayCloseService dayCloseService;
    private final PosHeldSaleService heldSaleService;
    private final PosCreditService creditService;
    private final PosReturnService returnService;
    private final PosPrinterService printerService;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;

    public PosOperationsController(PosReportService reportService, PosDayCloseService dayCloseService,
                                   PosHeldSaleService heldSaleService, PosCreditService creditService,
                                   PosReturnService returnService, PosPrinterService printerService,
                                   PosSettingsService settingsService, PosAuditService auditService) {
        this.reportService = reportService;
        this.dayCloseService = dayCloseService;
        this.heldSaleService = heldSaleService;
        this.creditService = creditService;
        this.returnService = returnService;
        this.printerService = printerService;
        this.settingsService = settingsService;
        this.auditService = auditService;
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    /** GET /api/pos/reports/z?date=2026-10-06 */
    @GetMapping("/reports/z")
    public ResponseEntity<ZReport> zReport(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reportService.zReport(date));
    }

    /** GET /api/pos/reports/analytics?from=&to= */
    @GetMapping("/reports/analytics")
    public ResponseEntity<Analytics> analytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.analytics(from, to));
    }

    // ── Day close ───────────────────────────────────────────────────────────

    @PostMapping("/day-close")
    public ResponseEntity<DayCloseDTO> closeDay(@RequestBody PosRequests.DayClose request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dayCloseService.close(request));
    }

    /** POST /api/pos/day-close/2026-10-07/reopen — supervisor (or PIN), latest closed day only. */
    @PostMapping("/day-close/{date}/reopen")
    public ResponseEntity<DayCloseDTO> reopenDay(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                 @RequestBody(required = false) PosRequests.SupervisorAction request) {
        return ResponseEntity.ok(dayCloseService.reopen(date, request));
    }

    @GetMapping("/day-close/history")
    public ResponseEntity<List<DayCloseDTO>> dayCloseHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(dayCloseService.history(from, to));
    }

    /** The Z-report JSON frozen when the day was closed. */
    @GetMapping(value = "/day-close/{date}/snapshot", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> dayCloseSnapshot(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String json = dayCloseService.snapshot(date);
        if (json == null) throw new BusinessRuleViolationException("No snapshot was stored for " + date + ".");
        return ResponseEntity.ok(json);
    }

    // ── Held sales ──────────────────────────────────────────────────────────

    @GetMapping("/held-sales")
    public ResponseEntity<List<HeldSaleDTO>> heldSales() {
        return ResponseEntity.ok(heldSaleService.list());
    }

    @PostMapping("/held-sales")
    public ResponseEntity<HeldSaleDTO> holdSale(@RequestBody PosRequests.HoldSale request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(heldSaleService.hold(request));
    }

    @PostMapping("/held-sales/{id}/recall")
    public ResponseEntity<HeldSaleDTO> recallSale(@PathVariable Long id) {
        return ResponseEntity.ok(heldSaleService.recall(id));
    }

    @DeleteMapping("/held-sales/{id}")
    public ResponseEntity<Void> discardHeldSale(@PathVariable Long id) {
        heldSaleService.discard(id);
        return ResponseEntity.noContent().build();
    }

    // ── POS credit ──────────────────────────────────────────────────────────

    /** GET /api/pos/credit/outstanding?memberIds=1,2,3 → { "2": 164.85 } — POS credit still owed. */
    @GetMapping("/credit/outstanding")
    public ResponseEntity<java.util.Map<Long, java.math.BigDecimal>> creditOutstanding(@RequestParam(required = false) List<Long> memberIds) {
        return ResponseEntity.ok(creditService.outstanding(memberIds));
    }

    @GetMapping("/credit/members/{memberId}")
    public ResponseEntity<CustomerCreditDTO> memberCredit(@PathVariable Long memberId) {
        return ResponseEntity.ok(creditService.customer(memberId));
    }

    @GetMapping("/credit/payments")
    public ResponseEntity<List<CreditPaymentDTO>> creditPayments(@RequestParam Long memberId) {
        return ResponseEntity.ok(creditService.payments(memberId));
    }

    @PostMapping("/credit/payments")
    public ResponseEntity<CreditPaymentDTO> receiveCreditPayment(@RequestBody PosRequests.CreditPayment request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(creditService.receive(request));
    }

    // ── Returns ─────────────────────────────────────────────────────────────

    @GetMapping("/returns/{id}")
    public ResponseEntity<ReturnDTO> getReturn(@PathVariable Long id) {
        return ResponseEntity.ok(returnService.get(id));
    }

    // ── Printers ────────────────────────────────────────────────────────────

    @GetMapping("/printers")
    public ResponseEntity<List<PrinterDTO>> printers() {
        return ResponseEntity.ok(printerService.list());
    }

    @PostMapping("/printers")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<PrinterDTO> createPrinter(@RequestBody PosRequests.Printer request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(printerService.create(request));
    }

    @PutMapping("/printers/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<PrinterDTO> updatePrinter(@PathVariable Long id, @RequestBody PosRequests.Printer request) {
        return ResponseEntity.ok(printerService.update(id, request));
    }

    @DeleteMapping("/printers/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<Void> deletePrinter(@PathVariable Long id) {
        printerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** POST /api/pos/printers/{id}/print-escpos — relay ESC/POS bytes to a network printer. */
    @PostMapping("/printers/{id}/print-escpos")
    public ResponseEntity<PrintResult> printEscPos(@PathVariable Long id, @RequestBody PosRequests.EscPosPrint request) {
        return ResponseEntity.ok(printerService.printEscPos(id, request));
    }

    @PostMapping("/printers/{id}/test-result")
    public ResponseEntity<PrinterDTO> recordPrinterTest(@PathVariable Long id, @RequestBody PosRequests.PrinterTestResult request) {
        return ResponseEntity.ok(printerService.recordTest(id, request));
    }

    // ── Settings ────────────────────────────────────────────────────────────

    @GetMapping("/settings")
    public ResponseEntity<SettingsDTO> settings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<SettingsDTO> updateSettings(@RequestBody PosRequests.Settings request) {
        return ResponseEntity.ok(settingsService.update(request));
    }

    @PostMapping("/settings/supervisor-pin")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<SettingsDTO> setSupervisorPin(@RequestBody PosRequests.SupervisorPin request) {
        return ResponseEntity.ok(settingsService.setSupervisorPin(request));
    }

    @PostMapping("/settings/verify-pin")
    public ResponseEntity<PinCheck> verifyPin(@RequestBody PosRequests.SupervisorPin request) {
        return ResponseEntity.ok(new PinCheck(settingsService.verifyPin(request.pin())));
    }

    // ── Audit ───────────────────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<AuditPage> auditLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(auditService.search(from, to, action, user, sessionId, page, size));
    }

    /** Terminal-side events (drawer opened, terminal locked, receipt shared, …). */
    @PostMapping("/audit-logs")
    public ResponseEntity<AuditLogDTO> recordClientEvent(@RequestBody PosRequests.ClientAudit request) {
        String action = request.action() == null ? "" : request.action().trim().toUpperCase();
        if (!PosAuditService.CLIENT_ACTIONS.contains(action)) {
            throw new BusinessRuleViolationException("Unsupported POS audit action: " + request.action());
        }
        String details = request.details() != null && request.details().length() > 1000
                ? request.details().substring(0, 1000) : request.details();
        var entry = auditService.log(action, request.referenceType(), request.referenceId(), request.referenceNumber(),
                request.posSessionId(), request.amount(), details, null, request.terminalName());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuditLogDTO(entry.getId(), entry.getAction(),
                entry.getReferenceType(), entry.getReferenceId(), entry.getReferenceNumber(), entry.getPosSessionId(),
                entry.getAmount(), entry.getDetails(), entry.getPerformedBy(), entry.getApprovedBy(),
                entry.getTerminalName(), entry.getCreatedAt()));
    }
}
