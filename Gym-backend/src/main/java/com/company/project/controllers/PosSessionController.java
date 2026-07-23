package com.company.project.controllers;

import com.company.project.dto.CashMovementDTO;
import com.company.project.dto.CashMovementRequestDTO;
import com.company.project.dto.CloseSessionRequestDTO;
import com.company.project.dto.PosSessionRequestDTO;
import com.company.project.dto.PosSessionResponseDTO;
import com.company.project.dto.SaleTransactionPageResponseDTO;
import com.company.project.dto.SessionReportDTO;
import com.company.project.dto.SessionsPageResponseDTO;
import com.company.project.services.PosSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pos/sessions")
public class PosSessionController {

    private final PosSessionService posSessionService;

    public PosSessionController(PosSessionService posSessionService) {
        this.posSessionService = posSessionService;
    }

    /**
     * GET /api/pos/sessions?page=1&size=20
     */
    @GetMapping
    public ResponseEntity<SessionsPageResponseDTO> getSessions(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(posSessionService.getSessions(page, size));
    }

    /**
     * GET /api/pos/sessions/active
     * Returns 404 if no active session (frontend checks for 404 to show "open session" screen)
     */
    @GetMapping("/active")
    public ResponseEntity<PosSessionResponseDTO> getActiveSession() {
        try {
            return ResponseEntity.ok(posSessionService.getActiveSession());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/pos/sessions/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PosSessionResponseDTO> getSessionById(@PathVariable Long id) {
        return ResponseEntity.ok(posSessionService.getSessionById(id));
    }

    /**
     * POST /api/pos/sessions
     */
    @PostMapping
    public ResponseEntity<PosSessionResponseDTO> openSession(@RequestBody PosSessionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(posSessionService.openSession(request));
    }

    /**
     * POST /api/pos/sessions/{id}/close
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<PosSessionResponseDTO> closeSession(
            @PathVariable Long id,
            @RequestBody CloseSessionRequestDTO request) {
        return ResponseEntity.ok(posSessionService.closeSession(
                id, request.getClosingDenominations(), request.getClosingCash(), request.getNotes()));
    }

    /**
     * GET /api/pos/sessions/{id}/transactions?page=1&size=20
     */
    @GetMapping("/{id}/transactions")
    public ResponseEntity<SaleTransactionPageResponseDTO> getSessionTransactions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(posSessionService.getSessionTransactions(id, page, size));
    }

    /**
     * GET /api/pos/sessions/{id}/cash-movements
     */
    @GetMapping("/{id}/cash-movements")
    public ResponseEntity<List<CashMovementDTO>> getCashMovements(@PathVariable Long id) {
        return ResponseEntity.ok(posSessionService.getCashMovements(id));
    }

    /**
     * POST /api/pos/sessions/{id}/cash-movements
     */
    @PostMapping("/{id}/cash-movements")
    public ResponseEntity<CashMovementDTO> addCashMovement(
            @PathVariable Long id,
            @RequestBody CashMovementRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(posSessionService.addCashMovement(id, request));
    }

    /**
     * GET /api/pos/sessions/{id}/report
     */
    @GetMapping("/{id}/report")
    public ResponseEntity<SessionReportDTO> getSessionReport(@PathVariable Long id) {
        return ResponseEntity.ok(posSessionService.getSessionReport(id));
    }
}
