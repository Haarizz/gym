package com.company.project.controllers;

import com.company.project.dto.TrainingStreamAnalyticsDTO;
import com.company.project.dto.TrainingStreamRequestDTO;
import com.company.project.dto.TrainingStreamResponseDTO;
import com.company.project.services.TrainingStreamService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/training-streams")
public class TrainingStreamController {

    private final TrainingStreamService streamService;

    public TrainingStreamController(TrainingStreamService streamService) {
        this.streamService = streamService;
    }

    @GetMapping
    public ResponseEntity<List<TrainingStreamResponseDTO>> getStreams(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(streamService.getStreams(status, category, search));
    }

    @PostMapping
    public ResponseEntity<TrainingStreamResponseDTO> createStream(
            @RequestBody TrainingStreamRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(streamService.createStream(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TrainingStreamResponseDTO> updateStream(
            @PathVariable Long id,
            @RequestBody TrainingStreamRequestDTO request) {
        return ResponseEntity.ok(streamService.updateStream(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStream(@PathVariable Long id) {
        streamService.deleteStream(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<TrainingStreamResponseDTO> startStream(@PathVariable Long id) {
        return ResponseEntity.ok(streamService.startStream(id));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<TrainingStreamResponseDTO> endStream(@PathVariable Long id) {
        return ResponseEntity.ok(streamService.endStream(id));
    }

    @GetMapping("/analytics")
    public ResponseEntity<TrainingStreamAnalyticsDTO> getAnalytics() {
        return ResponseEntity.ok(streamService.getAnalytics());
    }
}
