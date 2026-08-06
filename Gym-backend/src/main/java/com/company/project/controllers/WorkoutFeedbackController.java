package com.company.project.controllers;

import com.company.project.dto.WorkoutFeedbackAnalyticsDTO;
import com.company.project.dto.WorkoutFeedbackDTO;
import com.company.project.dto.WorkoutFeedbackNotesRequestDTO;
import com.company.project.dto.WorkoutFeedbackRequestDTO;
import com.company.project.dto.WorkoutSessionDTO;
import com.company.project.services.WorkoutFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workout-feedback")
public class WorkoutFeedbackController {

    @Autowired
    private WorkoutFeedbackService workoutFeedbackService;

    @GetMapping("/sessions")
    public ResponseEntity<List<WorkoutSessionDTO>> getRecentSessions(
            @RequestParam(required = false) Long memberId) {
        if (memberId != null) {
            return ResponseEntity.ok(workoutFeedbackService.getMemberSessions(memberId));
        }
        return ResponseEntity.ok(workoutFeedbackService.getRecentSessions());
    }

    @PostMapping
    public ResponseEntity<Void> submitFeedback(@RequestBody WorkoutFeedbackRequestDTO requestDTO) {
        workoutFeedbackService.submitFeedback(requestDTO);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<WorkoutFeedbackDTO>> getAllFeedbacks(
            @RequestParam(required = false) Long memberId) {
        if (memberId != null) {
            return ResponseEntity.ok(workoutFeedbackService.getMemberFeedbacks(memberId));
        }
        return ResponseEntity.ok(workoutFeedbackService.getAllFeedbacks());
    }

    @GetMapping("/analytics")
    public ResponseEntity<WorkoutFeedbackAnalyticsDTO> getFeedbackAnalytics() {
        return ResponseEntity.ok(workoutFeedbackService.getFeedbackAnalytics());
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<WorkoutFeedbackDTO> updateNotes(@PathVariable Long id, @RequestBody WorkoutFeedbackNotesRequestDTO requestDTO) {
        return ResponseEntity.ok(workoutFeedbackService.updateNotes(id, requestDTO));
    }
}
