package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.DayStatus;
import com.company.project.dto.pos.PosResponses.SessionDTO;
import com.company.project.services.pos.PosSessionControlService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Session lifecycle controls and the business-day status. Who may do what (owner, supervisor,
 * supervisor PIN) is enforced by PosSessionControlService.
 */
@RestController
@RequestMapping("/api/pos")
public class PosSessionControlController {

    private final PosSessionControlService controlService;

    public PosSessionControlController(PosSessionControlService controlService) {
        this.controlService = controlService;
    }

    /** GET /api/pos/day-status — business-day phase, pending Day Close, sessions needing closure. */
    @GetMapping("/day-status")
    public ResponseEntity<DayStatus> dayStatus() {
        return ResponseEntity.ok(controlService.dayStatus());
    }

    @PostMapping("/sessions/{id}/suspend")
    public ResponseEntity<SessionDTO> suspend(@PathVariable Long id) {
        return ResponseEntity.ok(controlService.suspend(id));
    }

    @PostMapping("/sessions/{id}/resume")
    public ResponseEntity<SessionDTO> resume(@PathVariable Long id) {
        return ResponseEntity.ok(controlService.resume(id));
    }

    /** Body: { supervisor_pin, reason } — the caller becomes the session's owner. */
    @PostMapping("/sessions/{id}/takeover")
    public ResponseEntity<SessionDTO> takeover(@PathVariable Long id, @RequestBody(required = false) PosRequests.SupervisorAction req) {
        return ResponseEntity.ok(controlService.takeover(id, req));
    }

    @PostMapping("/sessions/{id}/begin-closure")
    public ResponseEntity<SessionDTO> beginClosure(@PathVariable Long id) {
        return ResponseEntity.ok(controlService.beginClosure(id));
    }

    /** Body: { supervisor_pin, reason } — supervisor only. */
    @PostMapping("/sessions/{id}/cancel-closure")
    public ResponseEntity<SessionDTO> cancelClosure(@PathVariable Long id, @RequestBody(required = false) PosRequests.SupervisorAction req) {
        return ResponseEntity.ok(controlService.cancelClosure(id, req));
    }

    @PostMapping("/sessions/{id}/touch")
    public ResponseEntity<Void> touch(@PathVariable Long id) {
        controlService.touch(id);
        return ResponseEntity.noContent().build();
    }
}
