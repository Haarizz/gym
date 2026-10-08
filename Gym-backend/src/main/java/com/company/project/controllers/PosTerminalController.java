package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.services.pos.PosTerminalService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * POS terminals & counters (BillBull parity). Any POS user's browser registers and heartbeats
 * itself; managing terminals and counters needs POINT_OF_SALE_EDIT. Moving a session to another
 * terminal is supervisor-approved in the service (PIN for cashiers).
 */
@RestController
@RequestMapping("/api/pos")
public class PosTerminalController {

    private final PosTerminalService service;

    public PosTerminalController(PosTerminalService service) {
        this.service = service;
    }

    @PostMapping("/terminals/register")
    public ResponseEntity<TerminalRegistration> register(@RequestBody PosRequests.TerminalRegister request, HttpServletRequest http) {
        return ResponseEntity.ok(service.register(request, clientIp(http)));
    }

    @PostMapping("/terminals/{code}/heartbeat")
    public ResponseEntity<TerminalDTO> heartbeat(@PathVariable String code, HttpServletRequest http) {
        return ResponseEntity.ok(service.heartbeat(code, clientIp(http)));
    }

    /** GET /api/pos/terminals?includeRetired=true */
    @GetMapping("/terminals")
    public ResponseEntity<List<TerminalDTO>> list(@RequestParam(defaultValue = "false") boolean includeRetired) {
        return ResponseEntity.ok(service.list(includeRetired));
    }

    @GetMapping("/terminals/{id:\\d+}")
    public ResponseEntity<TerminalDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping("/terminals/{id}/approve")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> approve(@PathVariable Long id) {
        return ResponseEntity.ok(service.approve(id));
    }

    @PostMapping("/terminals/{id}/reject")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> reject(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(service.reject(id, body == null ? null : body.get("reason")));
    }

    @PutMapping("/terminals/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> update(@PathVariable Long id, @RequestBody PosRequests.TerminalUpdate request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PutMapping("/terminals/{id}/status")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> setStatus(@PathVariable Long id, @RequestBody PosRequests.TerminalStatus request) {
        return ResponseEntity.ok(service.setStatus(id, request));
    }

    @PutMapping("/terminals/{id}/set-main")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> setMain(@PathVariable Long id) {
        return ResponseEntity.ok(service.setMain(id));
    }

    @PostMapping("/terminals/{id}/archive")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> archive(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(service.archive(id, body == null ? null : body.get("reason")));
    }

    @PostMapping("/terminals/{id}/restore")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> restore(@PathVariable Long id) {
        return ResponseEntity.ok(service.restore(id));
    }

    @PostMapping("/terminals/{id}/decommission")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> decommission(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(service.decommission(id, body == null ? null : body.get("reason")));
    }

    // ── Session transfer ────────────────────────────────────────────────────

    @PostMapping("/sessions/{id}/transfer")
    public ResponseEntity<SessionDTO> transfer(@PathVariable Long id, @RequestBody PosRequests.SessionTransfer request) {
        return ResponseEntity.ok(service.transfer(id, request));
    }

    @GetMapping("/sessions/{id}/terminal-history")
    public ResponseEntity<List<SessionTerminalHistoryDTO>> terminalHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.sessionHistory(id));
    }

    // ── Counters ────────────────────────────────────────────────────────────

    @GetMapping("/counters")
    public ResponseEntity<List<CounterDTO>> counters() {
        return ResponseEntity.ok(service.counters());
    }

    @PostMapping("/counters")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CounterDTO> createCounter(@RequestBody PosRequests.Counter request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCounter(request));
    }

    @PutMapping("/counters/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CounterDTO> updateCounter(@PathVariable Long id, @RequestBody PosRequests.Counter request) {
        return ResponseEntity.ok(service.updateCounter(id, request));
    }

    private static String clientIp(HttpServletRequest http) {
        String fwd = http.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) return fwd.split(",")[0].trim();
        String ip = http.getRemoteAddr();
        return "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip) ? "127.0.0.1" : ip;
    }
}
