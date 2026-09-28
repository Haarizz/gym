package com.company.project.controllers.mobile.family;

import com.company.project.controlplane.entities.FamilyInvitationDirectoryEntry;
import com.company.project.controlplane.repositories.FamilyInvitationDirectoryRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.family.MobileFamilyInvitationService;
import com.company.project.services.mobile.family.MobileFamilyInvitationService.ClaimStatus;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mobile/family/invitations")
public class MobileFamilyClaimController {

    private static final Logger log = LoggerFactory.getLogger(MobileFamilyClaimController.class);

    private final MobileFamilyInvitationService invitationService;
    private final FamilyInvitationDirectoryRepository directoryRepository;
    private final EntityManagerFactory entityManagerFactory;

    public MobileFamilyClaimController(MobileFamilyInvitationService invitationService,
                                       FamilyInvitationDirectoryRepository directoryRepository,
                                       EntityManagerFactory entityManagerFactory) {
        this.invitationService = invitationService;
        this.directoryRepository = directoryRepository;
        this.entityManagerFactory = entityManagerFactory;
    }

    /**
     * Called by the app right after login/sign-up: claims every pending Family/Couple
     * invitation sent to the caller's (verified) account email, in whichever gyms
     * they're in, and reports what happened to each so the app can switch to the
     * gym. Strictly global — the app has no tenant yet for a brand-new invitee.
     */
    @PostMapping("/claim-pending")
    public ResponseEntity<List<Map<String, Object>>> claimPending(@AuthenticationPrincipal UserDetailsImpl user) {
        String email = MobileFamilyInvitationService.normalizeEmail(user.getEmail());
        List<Map<String, Object>> results = new ArrayList<>();
        if (!StringUtils.hasText(email)) {
            return ResponseEntity.ok(results);
        }
        List<FamilyInvitationDirectoryEntry> pending = directoryRepository.findByRecipientEmailAndStatus(email, "PENDING");
        if (pending.isEmpty()) {
            return ResponseEntity.ok(results);
        }

        // Each tenant's claim runs in its own transaction on its own connection —
        // an OSIV EntityManager would pin them all to the first one.
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder emHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
        }

        for (FamilyInvitationDirectoryEntry entry : pending) {
            String status;
            try {
                TenantContextHolder.setCurrentTenant(entry.getTenantSlug());
                ClaimStatus result = invitationService.claimInTenant(entry.getInvitationId(), email, user.getId());
                status = result.name();
                invitationService.updateDirectoryStatus(entry.getTenantSlug(), entry.getInvitationId(),
                        result == ClaimStatus.SKIPPED_EXISTING_MEMBERSHIP ? "SKIPPED" : result.name());
            } catch (Exception e) {
                // Left PENDING in the directory, so the next login retries it.
                log.error("Family invitation claim failed for tenant {} invitation {}",
                        entry.getTenantSlug(), entry.getInvitationId(), e);
                status = "ERROR";
            } finally {
                TenantContextHolder.clear();
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("tenantSlug", entry.getTenantSlug());
            row.put("gymName", entry.getGymName());
            row.put("inviterName", entry.getInviterName());
            row.put("planName", entry.getPlanName());
            row.put("status", status);
            results.add(row);
        }
        return ResponseEntity.ok(results);
    }

    // resend/revoke are tenant-routed by X-Tenant-ID and membership-checked by
    // TenantContextFilter like any other member endpoint.
    @PostMapping("/{id}/resend")
    public ResponseEntity<Void> resendInvitation(
            @PathVariable Long id,
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantSlug,
            @AuthenticationPrincipal UserDetailsImpl user) {
        invitationService.resendInvitation(id, user.getId(), tenantSlug);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<Void> revokeInvitation(
            @PathVariable Long id,
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantSlug,
            @AuthenticationPrincipal UserDetailsImpl user) {
        invitationService.revokeInvitation(id, user.getId(), tenantSlug);
        return ResponseEntity.ok().build();
    }
}
