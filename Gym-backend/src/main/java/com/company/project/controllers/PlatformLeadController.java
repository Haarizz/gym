package com.company.project.controllers;

import com.company.project.controlplane.service.PlatformLeadRateLimiter;
import com.company.project.controlplane.service.PlatformLeadService;
import com.company.project.dto.PlatformLeadFollowUpRequestDTO;
import com.company.project.dto.PlatformLeadPageResponseDTO;
import com.company.project.dto.PlatformLeadRequestDTO;
import com.company.project.dto.PlatformLeadResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Super Admin's gym-signup pipeline: Leads -> Follow Up -> Pending Approval.
 * POST / is the one public, unauthenticated route here (the onboarding form on
 * the pricing page) — see SecurityConfig's permitAll list; everything else
 * requires GYMBIOS_ADMIN's PLATFORM_LEADS_* permissions.
 */
@RestController
@RequestMapping("/api/platform-leads")
public class PlatformLeadController {

    private final PlatformLeadService platformLeadService;
    private final PlatformLeadRateLimiter rateLimiter;

    public PlatformLeadController(PlatformLeadService platformLeadService, PlatformLeadRateLimiter rateLimiter) {
        this.platformLeadService = platformLeadService;
        this.rateLimiter = rateLimiter;
    }

    /** POST /api/platform-leads — public. Submitted by business-onboarding-fullscreen.tsx. */
    @PostMapping
    public ResponseEntity<?> submitLead(@RequestBody PlatformLeadRequestDTO request, HttpServletRequest httpRequest) {
        String ip = clientIp(httpRequest);
        if (!rateLimiter.tryAcquire(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many requests. Please try again later."));
        }
        PlatformLeadResponseDTO dto = platformLeadService.submitLead(request, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** GET /api/platform-leads?stage=LEAD&page=1&size=20&search= */
    @GetMapping
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_VIEW')")
    public ResponseEntity<PlatformLeadPageResponseDTO> getByStage(
            @RequestParam(defaultValue = "LEAD") String stage,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(platformLeadService.getByStage(stage, page, size, search));
    }

    /** GET /api/platform-leads/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_VIEW')")
    public ResponseEntity<PlatformLeadResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(platformLeadService.getById(id));
    }

    /** PATCH /api/platform-leads/{id}/lead-status — body: { "leadStatus": "CONTACTED" } */
    @PatchMapping("/{id}/lead-status")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_EDIT')")
    public ResponseEntity<PlatformLeadResponseDTO> updateLeadStatus(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        String leadStatus = body.get("leadStatus");
        if (leadStatus == null || leadStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(platformLeadService.updateLeadStatus(id, leadStatus.toUpperCase()));
    }

    /** PATCH /api/platform-leads/{id}/approve-for-onboarding — moves LEAD -> PENDING_APPROVAL */
    @PatchMapping("/{id}/approve-for-onboarding")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_EDIT')")
    public ResponseEntity<PlatformLeadResponseDTO> approveForOnboarding(@PathVariable Long id) {
        return ResponseEntity.ok(platformLeadService.moveToPendingApproval(id));
    }

    /** PATCH /api/platform-leads/{id}/reject */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_EDIT')")
    public ResponseEntity<PlatformLeadResponseDTO> reject(@PathVariable Long id) {
        return ResponseEntity.ok(platformLeadService.reject(id));
    }

    /**
     * PATCH /api/platform-leads/{id}/mark-approved — call AFTER POST /api/gyms
     * succeeds, with the resulting tenant id/slug. Body: { "gymTenantId": 42, "gymSlug": "acme-gym" }
     */
    @PatchMapping("/{id}/mark-approved")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_EDIT')")
    public ResponseEntity<PlatformLeadResponseDTO> markApproved(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object tenantIdRaw = body.get("gymTenantId");
        Object slugRaw = body.get("gymSlug");
        if (tenantIdRaw == null || slugRaw == null) {
            // A bare badRequest().build() here (a still-empty 400 with no error
            // body) is what made this endpoint's real bug invisible: a frontend
            // response-mapping gap left the caller sending a request with no
            // gymTenantId key at all, and the empty body gave no clue why every
            // call failed. A real message at least tells the next caller (or dev
            // tools) what's actually missing, matching GlobalExceptionHandler's
            // existing IllegalArgumentException -> 400 INVALID_REQUEST convention.
            throw new IllegalArgumentException("gymTenantId and gymSlug are both required");
        }
        Long tenantId = Long.valueOf(tenantIdRaw.toString());
        return ResponseEntity.ok(platformLeadService.markApproved(id, tenantId, slugRaw.toString()));
    }

    /** POST /api/platform-leads/{id}/follow-ups */
    @PostMapping("/{id}/follow-ups")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_CREATE')")
    public ResponseEntity<PlatformLeadResponseDTO> addFollowUp(
            @PathVariable Long id, @RequestBody PlatformLeadFollowUpRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(platformLeadService.addFollowUp(id, request));
    }

    /** PATCH /api/platform-leads/{id}/follow-ups/{followUpId}/complete */
    @PatchMapping("/{id}/follow-ups/{followUpId}/complete")
    @PreAuthorize("hasAuthority('PLATFORM_LEADS_EDIT')")
    public ResponseEntity<PlatformLeadResponseDTO> completeFollowUp(
            @PathVariable Long id, @PathVariable Long followUpId) {
        return ResponseEntity.ok(platformLeadService.completeFollowUp(id, followUpId));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
