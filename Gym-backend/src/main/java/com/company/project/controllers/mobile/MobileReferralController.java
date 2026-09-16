package com.company.project.controllers.mobile;

import com.company.project.dto.MyReferralClaimDTO;
import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralProfile;
import com.company.project.entities.MobileReferralStatus;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MobileReferralResolutionService;
import com.company.project.services.MobileReferralService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import jakarta.persistence.EntityManagerFactory;

@RestController
@RequestMapping("/api/mobile/referrals")
public class MobileReferralController {

    private final MobileReferralService referralService;
    private final MobileReferralResolutionService resolutionService;
    private final EntityManagerFactory entityManagerFactory;

    public MobileReferralController(MobileReferralService referralService,
                                     MobileReferralResolutionService resolutionService,
                                     EntityManagerFactory entityManagerFactory) {
        this.referralService = referralService;
        this.resolutionService = resolutionService;
        this.entityManagerFactory = entityManagerFactory;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile() {
        Long userId = getCurrentUserId();
        MobileReferralProfile profile = referralService.getOrCreateProfile(userId);
        return ResponseEntity.ok(Map.of(
                "referralCode", profile.getReferralCode(),
                "url", "https://gymbios.app/ref/" + profile.getReferralCode()
        ));
    }

    @PostMapping("/claim")
    public ResponseEntity<?> claimCode(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code is required"));
        }
        
        Long userId = getCurrentUserId();
        try {
            // Find tenant via new service method
            String tenantSlug = referralService.findTenantForReferralCode(code.trim());
            if (tenantSlug == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid referral code"));
            }

            // Unbind OSIV EntityManager so the next JPA operation creates a NEW one with the tenant connection!
            if (org.springframework.transaction.support.TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
                org.springframework.orm.jpa.EntityManagerHolder emHolder = (org.springframework.orm.jpa.EntityManagerHolder) org.springframework.transaction.support.TransactionSynchronizationManager.unbindResource(entityManagerFactory);
                org.springframework.orm.jpa.EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
            }

            com.company.project.security.TenantContextHolder.setCurrentTenant(tenantSlug);
            
            MobileReferralAttribution attribution = referralService.claimCodeInTenant(userId, code.trim());
            return ResponseEntity.ok(Map.of(
                    "status", attribution.getStatus(),
                    "message", "Referral code claimed successfully",
                    "tenantSlug", tenantSlug
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
        } finally {
            com.company.project.security.TenantContextHolder.clear();
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<MobileReferralAttribution>> getHistory() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(referralService.getHistory(userId));
    }

    /** GET /api/mobile/referrals/my-claim — the code the current user claimed as a referee, if any. */
    @GetMapping("/my-claim")
    public ResponseEntity<MyReferralClaimDTO> getMyClaim() {
        Long userId = getCurrentUserId();
        return referralService.getMyClaim(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** POST /api/mobile/referrals/my-claim/retry — re-attempt conversion of the user's own stuck PENDING claim. */
    @PostMapping("/my-claim/retry")
    public ResponseEntity<?> retryMyClaim() {
        Long userId = getCurrentUserId();
        try {
            MobileReferralStatus status = resolutionService.retryForReferee(userId);
            return ResponseEntity.ok(Map.of("status", status));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Retry failed: " + e.getMessage()));
        }
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) auth.getPrincipal()).getId();
        }
        throw new RuntimeException("Unauthorized");
    }
}
