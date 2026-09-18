package com.company.project.controllers;

import com.company.project.dto.GymOsSettingResponseDTO;
import com.company.project.dto.GymOsSettingsBulkUpdateDTO;
import com.company.project.services.GymOsSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GymOS's Transfer Policy, Member Deactivation Policy, and System
 * Configuration widget: real, admin-managed key/value settings.
 */
@RestController
@RequestMapping("/api/gymos/settings")
public class GymOsSettingController {

    private final GymOsSettingService settingService;

    public GymOsSettingController(GymOsSettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/{category}")
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<GymOsSettingResponseDTO>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(settingService.getByCategory(category));
    }

    @PutMapping("/{category}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<List<GymOsSettingResponseDTO>> bulkUpsert(
            @PathVariable String category, @RequestBody GymOsSettingsBulkUpdateDTO request) {
        return ResponseEntity.ok(settingService.bulkUpsert(category, request.getSettings()));
    }
}
