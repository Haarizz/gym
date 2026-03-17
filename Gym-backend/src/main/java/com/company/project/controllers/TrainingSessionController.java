package com.company.project.controllers;

import com.company.project.dto.TrainingSessionRequestDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.services.TrainingSessionService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class TrainingSessionController {

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
}
