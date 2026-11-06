package com.company.project.controllers;

import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffTargetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Read-only: the old staff-targets shape for app versions that still call it, computed by the
 * performance engine. Targets are set through /api/performance/targets.
 */
@RestController
@RequestMapping("/api/staff-targets")
public class StaffTargetController {

    private final StaffTargetService targetService;

    public StaffTargetController(StaffTargetService targetService) {
        this.targetService = targetService;
    }

    @GetMapping
    public ResponseEntity<List<StaffTargetResponseDTO>> getTargets(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String scope,
            @RequestParam(value = "staff_db_id", required = false) Long staffDbId) {
        return ResponseEntity.ok(targetService.getTargets(year, month, scope, staffDbId));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyTargets(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            return ResponseEntity.ok(targetService.getMyTargets(principal.getId(), year, month));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body("No staff record linked to this account.");
        }
    }
}
