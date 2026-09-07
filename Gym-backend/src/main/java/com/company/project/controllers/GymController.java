package com.company.project.controllers;

import com.company.project.dto.GymRequestDTO;
import com.company.project.dto.GymResponseDTO;
import com.company.project.dto.TenantProvisioningResponseDTO;
import com.company.project.services.GymService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gyms")
public class GymController {

    private final GymService gymService;

    public GymController(GymService gymService) {
        this.gymService = gymService;
    }

    /** GET /api/gyms — list all gyms (admin only) */
    @GetMapping
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_VIEW')")
    public ResponseEntity<List<GymResponseDTO>> getAllGyms() {
        return ResponseEntity.ok(gymService.getAllGyms());
    }

    /** GET /api/gyms/active — list active gyms */
    @GetMapping("/active")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_VIEW')")
    public ResponseEntity<List<GymResponseDTO>> getActiveGyms() {
        return ResponseEntity.ok(gymService.getActiveGyms());
    }

    /** GET /api/gyms/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_VIEW')")
    public ResponseEntity<GymResponseDTO> getGymById(@PathVariable Long id) {
        return ResponseEntity.ok(gymService.getGymById(id));
    }

    /**
     * POST /api/gyms — create a new gym. Phase 3: always provisions a brand-new,
     * dedicated Postgres database asynchronously; 202 means "accepted, not yet
     * complete" — poll GET on the control-plane tenant (not yet exposed as its own
     * endpoint) or retry-provisioning if it lands in PROVISION_FAILED.
     */
    @PostMapping
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_CREATE')")
    public ResponseEntity<TenantProvisioningResponseDTO> createGym(@RequestBody GymRequestDTO request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(gymService.createGym(request));
    }

    /**
     * POST /api/gyms/{tenantId}/retry-provisioning — re-attempts provisioning for a
     * tenant stuck in PROVISION_FAILED. {tenantId} is the control-plane Tenant id
     * returned by the original 202 response, NOT a primary-DB Gym id — no Gym row
     * exists in the primary DB for a Phase-3-provisioned tenant.
     */
    /**
     * Deserializes into a plain Map rather than @RequestBody(required = false)
     * GymRequestDTO directly. Confirmed live in production: with the DTO bound
     * directly, every field came back null despite a correctly-formed JSON body
     * on the wire (verified byte-for-byte with a hexdump) and Content-Length
     * matching — a real Spring MVC binding issue specific to this
     * required=false + custom-DTO combination that resisted further diagnosis.
     * Binding to Map<String,Object> first and mapping fields across by hand
     * sidesteps whatever that was, and is what's actually running in
     * production (confirmed working: retry-provisioning completed a real gym
     * to ACTIVE status through this exact code path).
     */
    @PostMapping("/{tenantId}/retry-provisioning")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_CREATE')")
    public ResponseEntity<TenantProvisioningResponseDTO> retryProvisioning(
            @PathVariable Long tenantId,
            @RequestBody(required = false) Map<String, Object> rawBody) {
        GymRequestDTO requestBody = new GymRequestDTO();
        if (rawBody != null) {
            Object v;
            if ((v = rawBody.get("ownerUsername")) != null) requestBody.setOwnerUsername(v.toString());
            if ((v = rawBody.get("ownerPassword")) != null) requestBody.setOwnerPassword(v.toString());
            if ((v = rawBody.get("ownerEmail")) != null) requestBody.setOwnerEmail(v.toString());
            if ((v = rawBody.get("address")) != null) requestBody.setAddress(v.toString());
            if ((v = rawBody.get("lat")) != null) requestBody.setLat(Double.valueOf(v.toString()));
            if ((v = rawBody.get("lng")) != null) requestBody.setLng(Double.valueOf(v.toString()));
        }
        return ResponseEntity.accepted().body(gymService.retryProvisioning(tenantId, requestBody));
    }

    /** PUT /api/gyms/{id} — update gym details */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<GymResponseDTO> updateGym(
            @PathVariable Long id,
            @RequestBody GymRequestDTO request) {
        return ResponseEntity.ok(gymService.updateGym(id, request));
    }

    /** PATCH /api/gyms/{id}/status — activate/deactivate/suspend gym */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<GymResponseDTO> updateGymStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gymService.updateGymStatus(id, status));
    }

    /**
     * PUT /api/gyms/tenant/{tenantId} — update gym details for a gym that exists
     * ONLY as a control-plane Tenant (every gym created since Phase 3's cutover;
     * see GymResponseDTO.source). Distinct URL shape from PUT /{id}, not an
     * overload of it — Tenant.id and Gym.id are separate id spaces that can
     * numerically collide, so a single ambiguous route could silently update the
     * wrong physical row.
     */
    @PutMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<GymResponseDTO> updateTenantGym(
            @PathVariable Long tenantId,
            @RequestBody GymRequestDTO request) {
        return ResponseEntity.ok(gymService.updateTenantGym(tenantId, request));
    }

    /** PATCH /api/gyms/tenant/{tenantId}/status — same as PATCH /{id}/status, for a control-plane-only tenant. */
    @PatchMapping("/tenant/{tenantId}/status")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<GymResponseDTO> updateTenantGymStatus(
            @PathVariable Long tenantId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gymService.updateTenantGymStatus(tenantId, status));
    }

    /** POST /api/gyms/{id}/owner — issue or reset the gym owner's login credentials */
    @PostMapping("/{id}/owner")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<GymResponseDTO> issueOwnerLogin(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String email = body.get("email");
        return ResponseEntity.ok(gymService.issueOrResetOwnerLogin(id, username, password, email));
    }
}
