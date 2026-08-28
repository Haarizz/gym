package com.company.project.controllers;

import com.company.project.dto.BranchRequestDTO;
import com.company.project.dto.BranchResponseDTO;
import com.company.project.services.BranchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    /** GET /api/branches — list all branches (admin only) */
    @GetMapping
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_VIEW')")
    public ResponseEntity<List<BranchResponseDTO>> getAllBranches() {
        return ResponseEntity.ok(branchService.getAllBranches());
    }

    /** GET /api/branches/active — list active branches */
    @GetMapping("/active")
    public ResponseEntity<List<BranchResponseDTO>> getActiveBranches() {
        return ResponseEntity.ok(branchService.getActiveBranches());
    }

    /** GET /api/branches/my-branches — branches accessible to current user */
    @GetMapping("/my-branches")
    public ResponseEntity<List<BranchResponseDTO>> getMyBranches() {
        return ResponseEntity.ok(branchService.getMyBranches());
    }

    /** GET /api/branches/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_VIEW')")
    public ResponseEntity<BranchResponseDTO> getBranchById(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.getBranchById(id));
    }

    /** POST /api/branches — create a new branch */
    @PostMapping
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_CREATE')")
    public ResponseEntity<BranchResponseDTO> createBranch(@RequestBody BranchRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(branchService.createBranch(request));
    }

    /** PUT /api/branches/{id} — update branch details */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<BranchResponseDTO> updateBranch(
            @PathVariable Long id,
            @RequestBody BranchRequestDTO request) {
        return ResponseEntity.ok(branchService.updateBranch(id, request));
    }

    /** PATCH /api/branches/{id}/status — activate/deactivate branch */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<BranchResponseDTO> updateBranchStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(branchService.updateBranchStatus(id, status));
    }

    // ── Staff/Trainer branch assignments ─────────────────────────────────

    /** GET /api/branches/{id}/staff — staff assigned to branch */
    @GetMapping("/{id}/staff")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_VIEW')")
    public ResponseEntity<List<Long>> getStaffForBranch(@PathVariable Long id) {
        // Return staff IDs assigned to this branch
        return ResponseEntity.ok(branchService.getStaffBranchIds(id));
    }

    /** POST /api/branches/{branchId}/staff/{staffId} — assign staff to branch */
    @PostMapping("/{branchId}/staff/{staffId}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<Void> assignStaffToBranch(
            @PathVariable Long branchId,
            @PathVariable Long staffId) {
        branchService.assignStaffToBranch(staffId, branchId);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/branches/{branchId}/staff/{staffId} — remove staff from branch */
    @DeleteMapping("/{branchId}/staff/{staffId}")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<Void> removeStaffFromBranch(
            @PathVariable Long branchId,
            @PathVariable Long staffId) {
        branchService.removeStaffFromBranch(staffId, branchId);
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/branches/staff/{staffId}/branches — set all branches for a staff member */
    @PutMapping("/staff/{staffId}/branches")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<List<BranchResponseDTO>> setStaffBranches(
            @PathVariable Long staffId,
            @RequestBody List<Long> branchIds) {
        branchService.setStaffBranches(staffId, branchIds);
        return ResponseEntity.ok(branchService.getStaffBranches(staffId));
    }

    /** GET /api/branches/staff/{staffId}/branches — get branches for a staff member */
    @GetMapping("/staff/{staffId}/branches")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_VIEW')")
    public ResponseEntity<List<BranchResponseDTO>> getStaffBranches(@PathVariable Long staffId) {
        return ResponseEntity.ok(branchService.getStaffBranches(staffId));
    }

    // ── User branch assignments ─────────────────────────────────────────

    /** PUT /api/branches/user/{userId}/branches — set all branches for a user */
    @PutMapping("/user/{userId}/branches")
    @PreAuthorize("hasAuthority('BRANCH_MANAGEMENT_EDIT')")
    public ResponseEntity<Void> setUserBranches(
            @PathVariable Long userId,
            @RequestBody List<Long> branchIds) {
        branchService.setUserBranches(userId, branchIds);
        return ResponseEntity.ok().build();
    }
}
