package com.company.project.controllers.mobile.schedule;

import com.company.project.dto.mobile.schedule.StaffScheduleResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.schedule.MobileStaffScheduleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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
            @PathVariable Long id) {
        
        scheduleService.markTaskDone(principal, id);
        return ResponseEntity.ok().build();
    }
}
