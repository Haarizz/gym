package com.company.project.controllers;

import com.company.project.dto.BiosActivityLogRequestDTO;
import com.company.project.dto.BiosActivityLogResponseDTO;
import com.company.project.dto.BiosBranchComparisonDTO;
import com.company.project.dto.BiosInsightsDTO;
import com.company.project.dto.BiosOverviewDTO;
import com.company.project.dto.BiosSettingsDTO;
import com.company.project.services.BiosInsightsService;
import com.company.project.services.BiosService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bios")
public class BiosController {

    private final BiosService biosService;
    private final BiosInsightsService biosInsightsService;

    public BiosController(BiosService biosService, BiosInsightsService biosInsightsService) {
        this.biosService = biosService;
        this.biosInsightsService = biosInsightsService;
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

    /**
     * Member KPIs and the month-by-month member trend, counted in the database
     * for the active branch (or every branch in All Branches mode) — replaces the
     * page downloading up to 5,000 members to count them itself.
     */
    @GetMapping("/overview")
    public ResponseEntity<BiosOverviewDTO> getOverview(@RequestParam(defaultValue = "6") int months) {
        return ResponseEntity.ok(biosService.getOverview(months));
    }

    // Real-data payloads for the analysis dialogs; each dialog loads its own group when opened.

    @GetMapping("/insights/revenue")
    public ResponseEntity<BiosInsightsDTO.RevenueInsights> getRevenueInsights(@RequestParam(defaultValue = "90") int days) {
        return ResponseEntity.ok(biosInsightsService.getRevenueInsights(days));
    }

    @GetMapping("/insights/members")
    public ResponseEntity<BiosInsightsDTO.MemberInsights> getMemberInsights() {
        return ResponseEntity.ok(biosInsightsService.getMemberInsights());
    }

    @GetMapping("/insights/operations")
    public ResponseEntity<BiosInsightsDTO.OperationsInsights> getOperationsInsights() {
        return ResponseEntity.ok(biosInsightsService.getOperationsInsights());
    }

    @GetMapping("/insights/marketing")
    public ResponseEntity<BiosInsightsDTO.MarketingInsights> getMarketingInsights(@RequestParam(defaultValue = "365") int days) {
        return ResponseEntity.ok(biosInsightsService.getMarketingInsights(days));
    }

    /** Per-branch snapshot — only meaningful while viewing "All Branches". */
    @GetMapping("/branch-comparison")
    public ResponseEntity<List<BiosBranchComparisonDTO>> getBranchComparison() {
        return ResponseEntity.ok(biosService.getBranchComparison());
    }
}
