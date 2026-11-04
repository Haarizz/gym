package com.company.project.controllers;

import com.company.project.dto.TrainingSessionRequestDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.services.TrainingSessionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class TrainingSessionController {

    // Status changes, rosters (member contact details) and reminders are staff-only.
    private static final String NOT_A_MEMBER =
            "!(principal instanceof T(com.company.project.security.UserDetailsImpl) and principal.global)";

    private final TrainingSessionService trainingSessionService;

    public TrainingSessionController(TrainingSessionService trainingSessionService) {
        this.trainingSessionService = trainingSessionService;
    }

    @GetMapping
    public ResponseEntity<List<TrainingSessionResponseDTO>> getSessions(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long trainerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(trainingSessionService.getSessions(type, trainerId, startDate, endDate, search));
    }

    @PostMapping
    public ResponseEntity<TrainingSessionResponseDTO> createSession(@RequestBody TrainingSessionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(trainingSessionService.createSession(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TrainingSessionResponseDTO> updateSession(
            @PathVariable Long id,
            @RequestBody TrainingSessionRequestDTO request) {
        return ResponseEntity.ok(trainingSessionService.updateSession(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id) {
        trainingSessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    /** Body: { "status": "active" | "in_progress" | "completed" | "cancelled" } */
    @PreAuthorize(NOT_A_MEMBER)
    @PatchMapping("/{id}/status")
    public ResponseEntity<TrainingSessionResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(trainingSessionService.updateStatus(id, body.get("status")));
    }

    /** Session, trainer profile, participants (incl. waitlist) and reviews for the session dialog. */
    @PreAuthorize(NOT_A_MEMBER)
    @GetMapping("/{id}/overview")
    public ResponseEntity<com.company.project.dto.SessionOverviewDTO> getOverview(@PathVariable Long id) {
        return ResponseEntity.ok(trainingSessionService.getOverview(id));
    }

    /** Body (optional): { "note": "Bring a towel" }. Returns { "sent": n }. */
    @PreAuthorize(NOT_A_MEMBER)
    @PostMapping("/{id}/remind")
    public ResponseEntity<java.util.Map<String, Integer>> sendReminder(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        int sent = trainingSessionService.sendReminder(id, body == null ? null : body.get("note"));
        return ResponseEntity.ok(java.util.Map.of("sent", sent));
    }
}
