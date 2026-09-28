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
     * GET /api/gyms/check-slug?slug=... — early UX check for the Add Gym /
     * Pending Approval forms, so a collision surfaces before submit instead of
     * after. Not authoritative: createGym re-checks at submit time regardless.
     */
    @GetMapping("/check-slug")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_VIEW')")
    public ResponseEntity<Map<String, Boolean>> checkSlugAvailable(@RequestParam String slug) {
        return ResponseEntity.ok(Map.of("available", gymService.isSlugAvailable(slug)));
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

    /**
     * POST /api/gyms/catch-up-migrations — runs any Flyway migrations added to the
     * codebase since each tenant was provisioned against that tenant's own database
     * (see TenantProvisioningService.catchUpTenantMigrations). Synchronous and can
     * take a while with many tenants, but each is independent and idempotent, so
     * it's safe to call again if it's interrupted.
     */
    @PostMapping("/catch-up-migrations")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_EDIT')")
    public ResponseEntity<List<com.company.project.controlplane.service.TenantProvisioningService.TenantMigrationResult>> catchUpMigrations() {
        return ResponseEntity.ok(gymService.catchUpTenantMigrations());
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

    /**
     * DELETE /api/gyms/tenant/{tenantId} — irreversible hard delete: drops this
     * tenant's dedicated Postgres database and role, then removes every
     * control-plane row referencing it. Gated on the DELETE action (distinct from
     * EDIT, which every other tenant-mutation endpoint above uses) since this has
     * no undo, unlike a status toggle.
     */
    @DeleteMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('GYM_MANAGEMENT_DELETE')")
    public ResponseEntity<Void> deleteTenantGym(@PathVariable Long tenantId) {
        gymService.deleteTenantGym(tenantId);
        return ResponseEntity.noContent().build();
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
