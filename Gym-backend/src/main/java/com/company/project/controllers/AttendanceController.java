package com.company.project.controllers;

import com.company.project.dto.AttendanceStatsDTO;
import com.company.project.dto.CheckInResponse;
import com.company.project.dto.CheckOutResponse;
import com.company.project.dto.WalkInCheckInRequest;
import com.company.project.services.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    /**
     * List attendance with optional date filter, search, and pagination.
     *
     * GET /api/attendance?date=2026-04-07&search=john&page=0&size=50
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAttendance(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(attendanceService.getAttendance(date, search, page, size));
    }

    /**
     * Aggregate stats: visits, active now, avg duration, peak hour, attendance rate,
     * plus this-week and this-year trend arrays for charts.
     *
     * GET /api/attendance/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<AttendanceStatsDTO> getStats() {
        return ResponseEntity.ok(attendanceService.getStats());
    }

    /**
     * Check out a member by their attendance record ID.
     * Sets checkOutTime = now, calculates duration, status → completed.
     *
     * POST /api/attendance/{id}/checkout
     */
    @PostMapping("/{id}/checkout")
    public ResponseEntity<?> checkout(@PathVariable Long id) {
        try {
            CheckOutResponse resp = attendanceService.checkout(id);
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Walk-in check-in for daily visitors (no membership required).
     *
     * POST /api/attendance/walkin
     */
    @PostMapping("/walkin")
    public ResponseEntity<?> walkInCheckIn(@RequestBody WalkInCheckInRequest req) {
        try {
            CheckInResponse resp = attendanceService.walkInCheckIn(req);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
