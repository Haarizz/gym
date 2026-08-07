package com.company.project.controllers;

import com.company.project.dto.CommunicationRecordDTO;
import com.company.project.dto.FollowUpPageResponseDTO;
import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.FollowUpResponseDTO;
import com.company.project.dto.FollowUpStatsDTO;
import com.company.project.services.FollowUpService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/follow-ups")
public class FollowUpController {

    private final FollowUpService followUpService;

    public FollowUpController(FollowUpService followUpService) {
        this.followUpService = followUpService;
    }

    /** GET /api/follow-ups?page=1&size=20&status=&type=&priority=&assignedStaff=&search= */
    @GetMapping
    public ResponseEntity<FollowUpPageResponseDTO> getFollowUps(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String assignedStaff,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(followUpService.getFollowUps(page, size, status, type, priority, assignedStaff, search));
    }

    /** GET /api/follow-ups/stats */
    @GetMapping("/stats")
    public ResponseEntity<FollowUpStatsDTO> getStats() {
        return ResponseEntity.ok(followUpService.getStats());
    }

    /** GET /api/follow-ups/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<FollowUpResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(followUpService.getById(id));
    }

    /** POST /api/follow-ups */
    @PostMapping
    public ResponseEntity<FollowUpResponseDTO> create(@RequestBody FollowUpRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(followUpService.createFollowUp(request));
    }

    /** PUT /api/follow-ups/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<FollowUpResponseDTO> update(@PathVariable Long id,
                                                       @RequestBody FollowUpRequestDTO request) {
        return ResponseEntity.ok(followUpService.updateFollowUp(id, request));
    }

    /** DELETE /api/follow-ups/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        followUpService.deleteFollowUp(id);
        return ResponseEntity.noContent().build();
    }

    /** POST /api/follow-ups/{id}/complete */
    @PostMapping("/{id}/complete")
    public ResponseEntity<FollowUpResponseDTO> complete(@PathVariable Long id,
                                                         @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(followUpService.complete(id, body.get("outcome"), body.get("notes")));
    }

    /** POST /api/follow-ups/{id}/cancel */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<FollowUpResponseDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(followUpService.cancel(id));
    }

    /** POST /api/follow-ups/{id}/reschedule */
    @PostMapping("/{id}/reschedule")
    public ResponseEntity<FollowUpResponseDTO> reschedule(@PathVariable Long id,
                                                           @RequestBody Map<String, String> body) {
        // The reschedule dialog only collects a date (e.g. "2026-08-10"), not a time,
        // so pad it to midnight the same way create/edit already do before parsing.
        String dueDate = body.get("dueDate");
        LocalDateTime newDate = LocalDateTime.parse(dueDate.contains("T") ? dueDate : dueDate + "T00:00:00");
        return ResponseEntity.ok(followUpService.reschedule(id, newDate));
    }

    /** POST /api/follow-ups/mark-overdue */
    @PostMapping("/mark-overdue")
    public ResponseEntity<Void> markOverdue() {
        followUpService.markOverdueFollowUps();
        return ResponseEntity.ok().build();
    }

    // ── Communication Records ────────────────────────────────────────────────

    /** POST /api/follow-ups/{id}/records */
    @PostMapping("/{id}/records")
    public ResponseEntity<CommunicationRecordDTO> addRecord(@PathVariable Long id,
                                                             @RequestBody CommunicationRecordDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(followUpService.addRecord(id, dto));
    }

    /** DELETE /api/follow-ups/records/{recordId} */
    @DeleteMapping("/records/{recordId}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Long recordId) {
        followUpService.deleteRecord(recordId);
        return ResponseEntity.noContent().build();
    }
}
