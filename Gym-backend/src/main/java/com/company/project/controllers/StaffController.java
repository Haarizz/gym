package com.company.project.controllers;

import com.company.project.dto.StaffPageResponseDTO;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
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
