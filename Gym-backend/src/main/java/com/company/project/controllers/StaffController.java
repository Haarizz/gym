package com.company.project.controllers;

import com.company.project.dto.StaffPageResponseDTO;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.services.StaffService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

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

    @GetMapping("/{id}")
    public ResponseEntity<StaffResponseDTO> getStaffById(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.getStaffById(id));
    }

    @PostMapping
    public ResponseEntity<StaffResponseDTO> createStaff(@RequestBody StaffRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.createStaff(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StaffResponseDTO> updateStaff(
            @PathVariable Long id,
            @RequestBody StaffRequestDTO request) {
        return ResponseEntity.ok(staffService.updateStaff(id, request));
    }

    @DeleteMapping("/{id}")
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
    public ResponseEntity<?> setStaffCredentials(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        try {
            String appUsername = body.get("appUsername");
            String appPassword = body.get("appPassword");
            if (appPassword == null || appPassword.isBlank()) {
                return ResponseEntity.badRequest().body("Password is required");
            }
            return ResponseEntity.ok(staffService.setStaffCredentials(id, appUsername, appPassword));
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
