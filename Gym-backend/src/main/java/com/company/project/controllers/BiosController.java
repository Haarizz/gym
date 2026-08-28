package com.company.project.controllers;

import com.company.project.dto.BiosActivityLogRequestDTO;
import com.company.project.dto.BiosActivityLogResponseDTO;
import com.company.project.dto.BiosBranchComparisonDTO;
import com.company.project.dto.BiosSettingsDTO;
import com.company.project.services.BiosService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bios")
public class BiosController {

    private final BiosService biosService;

    public BiosController(BiosService biosService) {
        this.biosService = biosService;
    }

    /**
     * GET/PUT the BiOS page's Set Targets / Set Alerts / Schedule Report /
     * Configure buttons — previously those had no onClick handler at all
     * (see BiosScheduler for the jobs this now enables).
     */
    @GetMapping("/settings")
    public ResponseEntity<BiosSettingsDTO> getSettings() {
        return ResponseEntity.ok(biosService.getSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<BiosSettingsDTO> updateSettings(@RequestBody BiosSettingsDTO request) {
        return ResponseEntity.ok(biosService.updateSettings(request));
    }

    /**
     * Logs a report/export generation event — backs the "Recent Reports" and
     * "Recent Exports" lists on the BiOS page (previously hardcoded sample rows).
     */
    @PostMapping("/activity")
    public ResponseEntity<BiosActivityLogResponseDTO> logActivity(@RequestBody BiosActivityLogRequestDTO request) {
        return ResponseEntity.ok(biosService.logActivity(request));
    }

    @GetMapping("/activity")
    public ResponseEntity<List<BiosActivityLogResponseDTO>> getRecentActivity(
            @RequestParam String type,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(biosService.getRecentActivity(type, limit));
    }

    /** Per-branch snapshot — only meaningful while viewing "All Branches". */
    @GetMapping("/branch-comparison")
    public ResponseEntity<List<BiosBranchComparisonDTO>> getBranchComparison() {
        return ResponseEntity.ok(biosService.getBranchComparison());
    }
}
