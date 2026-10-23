package com.company.project.controllers;

import com.company.project.dto.AttendanceListItemDTO;
import com.company.project.dto.AttendanceStatsDTO;
import com.company.project.dto.CheckInResponse;
import com.company.project.dto.CheckOutResponse;
import com.company.project.dto.WalkInCheckInRequest;
import com.company.project.dto.WalkInSelfRegistrationDTOs;
import com.company.project.services.AttendanceService;
import com.company.project.services.CheckInSettingsService;
import com.company.project.services.WalkInRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final WalkInRegistrationService walkInRegistrationService;
    private final CheckInSettingsService checkInSettingsService;

    public AttendanceController(AttendanceService attendanceService,
                                WalkInRegistrationService walkInRegistrationService,
                                CheckInSettingsService checkInSettingsService) {
        this.attendanceService = attendanceService;
        this.walkInRegistrationService = walkInRegistrationService;
        this.checkInSettingsService = checkInSettingsService;
    }

    /**
     * List attendance with optional date filter, search, and pagination.
     *
     * GET /api/attendance?date=2026-04-07&search=john&page=0&size=50
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAttendance(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(attendanceService.getAttendance(date, startDate, endDate, search, page, size));
    }

    /**
     * Full check-in history for a single member, most recent first — used by the
     * member analytics page's Gym Usage tab.
     *
     * GET /api/attendance/member/{memberId}
     */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<AttendanceListItemDTO>> getMemberAttendance(@PathVariable Long memberId) {
        return ResponseEntity.ok(attendanceService.getMemberAttendance(memberId));
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
     * Before the branch's minimum visit time this answers 409 MIN_VISIT_NOT_REACHED;
     * the desk confirms and repeats with force=true.
     *
     * POST /api/attendance/{id}/checkout
     */
    @PostMapping("/{id}/checkout")
    public ResponseEntity<?> checkout(@PathVariable Long id,
                                      @RequestParam(defaultValue = "false") boolean force) {
        try {
            CheckOutResponse resp = attendanceService.checkout(id, force);
            return ResponseEntity.ok(resp);
        } catch (com.company.project.exceptions.MinVisitNotReachedException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage(), "code", "MIN_VISIT_NOT_REACHED"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Full analytics report for the reports page.
     * Returns daily summary, activity breakdown, peak hours, member trends, facility data, insights.
     *
     * GET /api/attendance/reports?startDate=2026-03-01&endDate=2026-04-08
     */
    /**
     * GET/PUT the "Schedule Automated Reports" toggle on the Attendance Reports
     * page — previously pure client-side React state with no backend, so it
     * silently reset on reload and no report was ever actually sent (see
     * AttendanceReportScheduler for the weekly job this now enables).
     */
    @GetMapping("/report-settings")
    public ResponseEntity<com.company.project.dto.AttendanceReportSettingsDTO> getReportSettings() {
        return ResponseEntity.ok(attendanceService.getReportSettings());
    }

    @PutMapping("/report-settings")
    public ResponseEntity<com.company.project.dto.AttendanceReportSettingsDTO> updateReportSettings(
            @RequestBody com.company.project.dto.AttendanceReportSettingsDTO request) {
        return ResponseEntity.ok(attendanceService.updateReportSettings(request));
    }

    /** GET/PUT the branch's check-in timing rules (Check In page › Configuration). */
    @GetMapping("/check-in-settings")
    public ResponseEntity<com.company.project.dto.CheckInSettingsDTO> getCheckInSettings() {
        return ResponseEntity.ok(checkInSettingsService.get());
    }

    @PutMapping("/check-in-settings")
    public ResponseEntity<?> updateCheckInSettings(@RequestBody com.company.project.dto.CheckInSettingsDTO request) {
        try {
            return ResponseEntity.ok(checkInSettingsService.update(request));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<Map<String, Object>> getReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        return ResponseEntity.ok(attendanceService.getReport(startDate, endDate));
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

    /**
     * Today's self-registered walk-ins waiting for staff to take payment. Paying goes
     * through POST /walkin with self_registration_id.
     *
     * GET /api/attendance/walkin-registrations
     */
    @GetMapping("/walkin-registrations")
    public ResponseEntity<List<WalkInSelfRegistrationDTOs.Pending>> getPendingWalkInRegistrations() {
        return ResponseEntity.ok(walkInRegistrationService.listPending());
    }

    /** POST /api/attendance/walkin-registrations/{id}/dismiss — visitor left / duplicate. */
    @PostMapping("/walkin-registrations/{id}/dismiss")
    public ResponseEntity<Void> dismissWalkInRegistration(@PathVariable Long id) {
        walkInRegistrationService.dismiss(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * The caller's walk-in QR link — personal (?s=code) for staff, so scans count
     * toward their target.
     *
     * GET /api/attendance/walkin/my-link
     */
    @GetMapping("/walkin/my-link")
    public ResponseEntity<WalkInSelfRegistrationDTOs.MyLink> getMyWalkInLink() {
        return ResponseEntity.ok(walkInRegistrationService.myLink());
    }
}
