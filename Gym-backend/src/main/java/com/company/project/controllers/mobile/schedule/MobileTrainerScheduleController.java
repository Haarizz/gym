package com.company.project.controllers.mobile.schedule;

import com.company.project.dto.mobile.schedule.*;
import com.company.project.entities.Staff;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffService;
import com.company.project.services.mobile.schedule.MobileTrainerScheduleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/mobile/schedule")
public class MobileTrainerScheduleController {

    private final MobileTrainerScheduleService scheduleService;
    private final StaffService staffService;

    public MobileTrainerScheduleController(MobileTrainerScheduleService scheduleService,
                                           StaffService staffService) {
        this.scheduleService = scheduleService;
        this.staffService = staffService;
    }

    private Long getStaffId(UserDetailsImpl principal) {
        if (principal == null) {
            throw new RuntimeException("Not authenticated");
        }
        com.company.project.dto.StaffResponseDTO staff = staffService.getStaffByUserId(principal.getId());
        if (staff == null) {
            throw new RuntimeException("No staff record linked to this account");
        }
        return Long.parseLong(staff.getId());
    }

    @GetMapping
    public ResponseEntity<MobileScheduleResponseDTO> getSchedule(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        if (startDate == null || endDate == null) {
            return ResponseEntity.badRequest().build();
        }
        
        Long staffId = getStaffId(principal);
        return ResponseEntity.ok(scheduleService.getSchedule(staffId, startDate, endDate));
    }

    @PostMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MobileSessionDTO> createSession(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MobileSessionRequestDTO request) {
        
        Long staffId = getStaffId(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.createSession(staffId, request));
    }

    @PutMapping("/sessions/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MobileSessionDTO> updateSession(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestBody MobileSessionRequestDTO request) {
        
        Long staffId = getStaffId(principal);
        return ResponseEntity.ok(scheduleService.updateSession(staffId, id, request));
    }

    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id) {
        
        Long staffId = getStaffId(principal);
        scheduleService.deleteSession(staffId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/availability")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MobileAvailabilityDTO> getAvailability(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        
        Long staffId = getStaffId(principal);
        return ResponseEntity.ok(scheduleService.getAvailability(staffId));
    }

    @PutMapping("/availability")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MobileAvailabilityDTO> updateAvailability(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MobileAvailabilityDTO request) {
        
        Long staffId = getStaffId(principal);
        return ResponseEntity.ok(scheduleService.updateAvailability(staffId, request));
    }
}
