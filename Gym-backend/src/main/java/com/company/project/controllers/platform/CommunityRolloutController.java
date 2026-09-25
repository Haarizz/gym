package com.company.project.controllers.platform;

import com.company.project.controlplane.community.baseline.CommunityBaselineReport;
import com.company.project.controlplane.community.baseline.CommunityBaselineService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Platform-owner operations for the Global Community migration. Phase 0
 * exposes only the read-only baseline; later phases add the audited rollout
 * state transitions here.
 */
@RestController
@RequestMapping("/api/platform/community-rollout")
@PreAuthorize("hasRole('GYMBIOS_ADMIN')")
public class CommunityRolloutController {

    private final CommunityBaselineService baselineService;

    public CommunityRolloutController(CommunityBaselineService baselineService) {
        this.baselineService = baselineService;
    }

    /** Read-only: never writes to any Community store. */
    @GetMapping("/baseline")
    public ResponseEntity<CommunityBaselineReport> baseline() {
        return ResponseEntity.ok(baselineService.run());
    }
}
