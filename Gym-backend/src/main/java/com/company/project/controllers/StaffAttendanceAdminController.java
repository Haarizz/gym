package com.company.project.controllers;

import com.company.project.services.ShiftAttendanceService;
import com.company.project.services.StaffAttendanceReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Staff Attendance management: shift-based daily records, the monthly summary that feeds
 * payroll, overtime / day decisions and correction requests. (Clocking in and out stays on
 * /api/staff/attendance, open to every staff member.)
 */
@RestController
@RequestMapping("/api/staff-attendance")
public class StaffAttendanceAdminController {

    private final ShiftAttendanceService attendance;
    private final StaffAttendanceReviewService review;

    public StaffAttendanceAdminController(ShiftAttendanceService attendance, StaffAttendanceReviewService review) {
        this.attendance = attendance;
        this.review = review;
    }

    @GetMapping("/daily")
    public List<Map<String, Object>> daily(@RequestParam String from, @RequestParam String to,
                                           @RequestParam(name = "staff_id", required = false) Long staffId) {
        LocalDate f = LocalDate.parse(from);
        LocalDate t = LocalDate.parse(to);
        if (t.isBefore(f) || t.isAfter(f.plusDays(62))) {
            throw new com.company.project.exceptions.BusinessRuleViolationException("Pick a range of up to two months");
        }
        return attendance.dailyRecords(f, t, staffId);
    }

    @GetMapping("/monthly")
    public List<Map<String, Object>> monthly(@RequestParam int year, @RequestParam int month) {
        return attendance.monthlySummary(YearMonth.of(year, month));
    }

    /** Body: { staff_id, date, approval_status?, approved_ot_minutes?, day_status?, note? } */
    @PostMapping("/decisions")
    public ResponseEntity<Void> decide(@RequestBody Map<String, Object> body) {
        review.decide(body);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/decisions/bulk")
    public Map<String, Object> decideMany(@RequestBody List<Map<String, Object>> items) {
        return Map.of("updated", review.decideMany(items));
    }

    @GetMapping("/corrections")
    public List<Map<String, Object>> corrections() {
        return review.listCorrections();
    }

    /** Body: { staff_id, date, check_in?, check_out?, day_status?, reason } */
    @PostMapping("/corrections")
    public Map<String, Object> requestCorrection(@RequestBody Map<String, Object> body) {
        return review.requestCorrection(body);
    }

    @PostMapping("/corrections/{id}/approve")
    public ResponseEntity<Void> approve(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        review.reviewCorrection(id, true, note(body));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/corrections/{id}/reject")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        review.reviewCorrection(id, false, note(body));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/corrections/{id}")
    public ResponseEntity<Void> withdraw(@PathVariable Long id) {
        review.cancelCorrection(id);
        return ResponseEntity.noContent().build();
    }

    private static String note(Map<String, Object> body) {
        Object n = body != null ? body.get("note") : null;
        return n != null && !String.valueOf(n).isBlank() ? String.valueOf(n).trim() : null;
    }
}
