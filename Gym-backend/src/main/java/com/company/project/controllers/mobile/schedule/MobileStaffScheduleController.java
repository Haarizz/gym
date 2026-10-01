package com.company.project.controllers.mobile.schedule;

import com.company.project.dto.FollowUpResponseDTO;
import com.company.project.dto.mobile.schedule.StaffScheduleResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.schedule.MobileStaffScheduleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/mobile/staff/schedule")
public class MobileStaffScheduleController {

    private final MobileStaffScheduleService scheduleService;

    public MobileStaffScheduleController(MobileStaffScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @GetMapping
    public ResponseEntity<StaffScheduleResponseDTO> getStaffSchedule(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        StaffScheduleResponseDTO response = scheduleService.getStaffSchedule(principal, date);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<Void> markTaskDone(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        // Optional { "outcome", "notes" } — older app builds send no body.
        String outcome = body != null ? body.get("outcome") : null;
        String notes = body != null ? body.get("notes") : null;
        scheduleService.markTaskDone(principal, id, outcome, notes);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/mobile/staff/schedule/{id}/next-follow-up
     * Body: { due_date: "yyyy-MM-dd", scheduled_time?: "HH:mm", type?, priority?, subject?, notes? }
     */
    @PostMapping("/{id}/next-follow-up")
    public ResponseEntity<FollowUpResponseDTO> scheduleNextFollowUp(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(scheduleService.scheduleNextFollowUp(principal, id, body));
    }
}
