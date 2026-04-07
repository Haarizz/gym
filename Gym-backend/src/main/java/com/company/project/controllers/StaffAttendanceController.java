package com.company.project.controllers;

import com.company.project.dto.StaffAttendanceDTO;
import com.company.project.services.StaffAttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff/attendance")
public class StaffAttendanceController {

    private final StaffAttendanceService staffAttendanceService;

    public StaffAttendanceController(StaffAttendanceService staffAttendanceService) {
        this.staffAttendanceService = staffAttendanceService;
    }

    /**
     * Clock in a staff member.
     *
     * POST /api/staff/attendance/clock-in
     * Body: { "staff_id": 1, "device_id": "WEB" }
     */
    @PostMapping("/clock-in")
    public ResponseEntity<?> clockIn(@RequestBody Map<String, Object> body) {
        try {
            Long staffId   = Long.valueOf(body.get("staff_id").toString());
            String deviceId = body.containsKey("device_id") ? body.get("device_id").toString() : "WEB";
            StaffAttendanceDTO dto = staffAttendanceService.clockIn(staffId, deviceId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException | NullPointerException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "staff_id is required"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Clock out a staff member by their active attendance record ID.
     *
     * POST /api/staff/attendance/{id}/clock-out
     */
    @PostMapping("/{id}/clock-out")
    public ResponseEntity<?> clockOut(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(staffAttendanceService.clockOut(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Clock out the active session for a staff by their staff DB id.
     *
     * POST /api/staff/attendance/clock-out?staff_id=1
     */
    @PostMapping("/clock-out")
    public ResponseEntity<?> clockOutByStaffId(@RequestParam("staff_id") Long staffId) {
        try {
            return ResponseEntity.ok(staffAttendanceService.clockOutByStaffId(staffId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/staff/attendance/today
     */
    @GetMapping("/today")
    public ResponseEntity<List<StaffAttendanceDTO>> getTodayAttendance() {
        return ResponseEntity.ok(staffAttendanceService.getTodayAttendance());
    }

    /**
     * Check if a staff member has an active clock-in session.
     *
     * GET /api/staff/attendance/active?staff_id=1
     */
    @GetMapping("/active")
    public ResponseEntity<Map<String, Object>> getActiveSession(@RequestParam("staff_id") Long staffId) {
        return ResponseEntity.ok(staffAttendanceService.getActiveSession(staffId));
    }
}
