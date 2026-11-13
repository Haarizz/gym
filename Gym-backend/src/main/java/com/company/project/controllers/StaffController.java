package com.company.project.controllers;

import com.company.project.dto.StaffPageResponseDTO;
import com.company.project.dto.StaffPerformanceMetricsDTO;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.dto.StaffSummaryDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffOverviewService;
import com.company.project.services.StaffService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    // Upper bound on ids per performance request — each id costs several revenue/lead queries.
    private static final int MAX_PERFORMANCE_IDS = 100;

    private final StaffService staffService;
    private final StaffOverviewService staffOverviewService;
    private final com.company.project.services.MyRecordsService myRecords;

    public StaffController(StaffService staffService, StaffOverviewService staffOverviewService,
                           com.company.project.services.MyRecordsService myRecords) {
        this.staffService = staffService;
        this.staffOverviewService = staffOverviewService;
        this.myRecords = myRecords;
    }

    /**
     * GET /api/staff/me/transactions?days=90
     * The caller's own salary payments and advances, plus receipts and POS sales recorded under
     * their login. Self-service for every role (only GETs; writes on /api/staff stay gated).
     */
    @GetMapping("/me/transactions")
    public ResponseEntity<?> getMyTransactions(@AuthenticationPrincipal UserDetailsImpl principal,
                                               @RequestParam(defaultValue = "90") int days) {
        if (principal == null) return ResponseEntity.status(401).body("Not authenticated");
        return ResponseEntity.ok(myRecords.transactions(principal, days));
    }

    /** GET /api/staff/me/attendance?month=yyyy-MM — the caller's own shift attendance for the month. */
    @GetMapping("/me/attendance")
    public ResponseEntity<?> getMyAttendance(@AuthenticationPrincipal UserDetailsImpl principal,
                                             @RequestParam(required = false) String month) {
        if (principal == null) return ResponseEntity.status(401).body("Not authenticated");
        java.time.YearMonth ym;
        try {
            ym = month != null && !month.isBlank() ? java.time.YearMonth.parse(month) : java.time.YearMonth.now();
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "month must be yyyy-MM"));
        }
        return ResponseEntity.ok(myRecords.attendance(principal, ym));
    }

    // Deliberately not permission-gated beyond authenticated(): several unrelated pages
    // (leads, follow-ups, check-in, trainings-classes, set-targets, salary-advances) use
    // this endpoint for generic "assign to staff" dropdowns regardless of the caller's
    // role, so gating it on STAFF_VIEW would break those for anyone without that
    // permission. Only the actual staff-management mutations below are permission-gated.
    @GetMapping
    public ResponseEntity<StaffPageResponseDTO> getStaff(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String branch,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(staffService.getStaff(search, role, department, status, branch, page, limit));
    }

    /**
     * GET /api/staff/me
     * Returns the staff record linked to the currently authenticated user (extracted from JWT).
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyStaffProfile(@AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            return ResponseEntity.ok(staffService.getStaffByUserId(principal.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body("No staff record linked to this account.");
        }
    }

    /**
     * GET /api/staff/summary
     * Branch-scoped headcount KPIs: total, active/inactive, and today's present/absent.
     */
    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('STAFF_VIEW')")
    public ResponseEntity<StaffSummaryDTO> getStaffSummary() {
        return ResponseEntity.ok(staffOverviewService.getSummary());
    }

    /**
     * GET /api/staff/performance?ids=1,2,3[&period=yyyy-MM]
     * Monthly performance snapshot (target achievement, per-metric figures and goals,
     * attendance, rating) for the given staff — typically the page shown in the list.
     * Defaults to the current month; future months fall back to the current one.
     */
    @GetMapping("/performance")
    @PreAuthorize("hasAuthority('STAFF_VIEW')")
    public ResponseEntity<List<StaffPerformanceMetricsDTO>> getStaffPerformance(
            @RequestParam List<Long> ids,
            @RequestParam(required = false) String period) {
        if (ids.size() > MAX_PERFORMANCE_IDS) {
            ids = ids.subList(0, MAX_PERFORMANCE_IDS);
        }
        java.time.YearMonth month = null;
        if (period != null && !period.isBlank()) {
            try {
                month = java.time.YearMonth.parse(period.trim());
            } catch (java.time.format.DateTimeParseException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.ok(staffOverviewService.getPerformance(ids, month));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StaffResponseDTO> getStaffById(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.getStaffById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('STAFF_CREATE')")
    public ResponseEntity<StaffResponseDTO> createStaff(@RequestBody StaffRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.createStaff(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('STAFF_EDIT')")
    public ResponseEntity<StaffResponseDTO> updateStaff(
            @PathVariable Long id,
            @RequestBody StaffRequestDTO request) {
        return ResponseEntity.ok(staffService.updateStaff(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('STAFF_DELETE')")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/staff/{id}/set-credentials
     * Body: { "appUsername": "...", "appPassword": "..." }
     * Creates app login if none exists, or updates password if one does.
     */
    @PostMapping("/{id}/set-credentials")
    @PreAuthorize("hasAuthority('STAFF_EDIT')")
    public ResponseEntity<?> setStaffCredentials(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        try {
            String appUsername = body.get("appUsername");
            String appPassword = body.get("appPassword");
            String appRole = body.get("appRole");
            if (appPassword == null || appPassword.isBlank()) {
                return ResponseEntity.badRequest().body("Password is required");
            }
            return ResponseEntity.ok(staffService.setStaffCredentials(id, appUsername, appPassword, appRole));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * PATCH /api/staff/{id}/toggle-access
     * Body: { "enabled": true/false }
     * Enables or disables the staff member's mobile app login account.
     */
    @PatchMapping("/{id}/toggle-access")
    @PreAuthorize("hasAuthority('STAFF_EDIT')")
    public ResponseEntity<?> toggleStaffAccess(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Boolean> body) {
        try {
            Boolean enabled = body.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body("Missing 'enabled' field");
            }
            return ResponseEntity.ok(staffService.toggleStaffAccess(id, enabled));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
