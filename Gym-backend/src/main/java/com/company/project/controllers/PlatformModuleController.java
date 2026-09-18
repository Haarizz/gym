package com.company.project.controllers;

import com.company.project.dto.ModuleAuditLogResponseDTO;
import com.company.project.dto.PlatformModuleResponseDTO;
import com.company.project.services.PlatformModuleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GymOS's Module Management: real enable/disable and status for platform
 * modules (see PlatformModuleService.MANAGEABLE_MODULES for the curated set).
 */
@RestController
@RequestMapping("/api/gymos/modules")
public class PlatformModuleController {

    private final PlatformModuleService platformModuleService;

    public PlatformModuleController(PlatformModuleService platformModuleService) {
        this.platformModuleService = platformModuleService;
    }

    /** GET /api/gymos/modules */
    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<PlatformModuleResponseDTO>> getAll() {
        return ResponseEntity.ok(platformModuleService.getAll());
    }

    /** GET /api/gymos/modules/audit-log?limit=20 */
    @GetMapping("/audit-log")
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<ModuleAuditLogResponseDTO>> getAuditLog(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(platformModuleService.getRecentAuditLog(limit));
    }

    /** PATCH /api/gymos/modules/{moduleKey}/enabled — body: { "enabled": true } */
    @PatchMapping("/{moduleKey}/enabled")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<PlatformModuleResponseDTO> setEnabled(
            @PathVariable String moduleKey, @RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            throw new IllegalArgumentException("enabled is required");
        }
        return ResponseEntity.ok(platformModuleService.setEnabled(moduleKey.toUpperCase(), enabled));
    }

    /** PATCH /api/gymos/modules/{moduleKey}/status — body: { "status": "MAINTENANCE" } */
    @PatchMapping("/{moduleKey}/status")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<PlatformModuleResponseDTO> setStatus(
            @PathVariable String moduleKey, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("status is required");
        }
        return ResponseEntity.ok(platformModuleService.setStatus(moduleKey.toUpperCase(), status.toUpperCase()));
    }
}
