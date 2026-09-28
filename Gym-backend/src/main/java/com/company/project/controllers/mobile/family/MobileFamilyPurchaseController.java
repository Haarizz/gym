package com.company.project.controllers.mobile.family;

import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import com.company.project.controlplane.repositories.GlobalBranchDiscoveryRepository;
import com.company.project.dto.mobile.discovery.MobilePurchaseRequestDTO;
import com.company.project.dto.mobile.family.MobileFamilyQuoteRequestDTO;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.UserProfile;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.GlobalUserService;
import com.company.project.services.mobile.family.MobileFamilyInvitationService;
import com.company.project.services.mobile.family.MobileFamilyPricingService;
import com.company.project.services.mobile.family.MobileFamilyPurchaseService;
import jakarta.persistence.EntityManagerFactory;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Tenant is chosen by the path, not X-Tenant-ID — the buyer usually isn't a member
 * of this gym yet (TenantContextFilter treats these paths as strictly global, the
 * same way it does /api/mobile/discovery/).
 */
@RestController
@RequestMapping("/api/mobile/family")
public class MobileFamilyPurchaseController {

    private final MobileFamilyPurchaseService purchaseService;
    private final MobileFamilyPricingService pricingService;
    private final MobileFamilyInvitationService invitationService;
    private final GlobalUserService globalUserService;
    private final GlobalBranchDiscoveryRepository globalDiscoveryRepository;
    private final EntityManagerFactory entityManagerFactory;

    public MobileFamilyPurchaseController(MobileFamilyPurchaseService purchaseService,
                                          MobileFamilyPricingService pricingService,
                                          MobileFamilyInvitationService invitationService,
                                          GlobalUserService globalUserService,
                                          GlobalBranchDiscoveryRepository globalDiscoveryRepository,
                                          EntityManagerFactory entityManagerFactory) {
        this.purchaseService = purchaseService;
        this.pricingService = pricingService;
        this.invitationService = invitationService;
        this.globalUserService = globalUserService;
        this.globalDiscoveryRepository = globalDiscoveryRepository;
        this.entityManagerFactory = entityManagerFactory;
    }

    @PostMapping("/quote/{tenantSlug}/{branchId}")
    public ResponseEntity<Map<String, Object>> quote(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId,
            @RequestBody @Valid MobileFamilyQuoteRequestDTO request) {
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);

            MembershipPlan plan = pricingService.resolveFamilyPlan(request.getPlanId());
            MobileFamilyPricingService.Quote quote = pricingService.quote(plan, request.getMemberIsMinor(),
                    request.getMemberPlanIds());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("planId", plan.getId());
            body.put("planName", plan.getName());
            body.put("billingMode", quote.isFamilyHeadBilling() ? "family_head" : "individual");
            body.put("headFee", quote.getHeadFee());
            body.put("memberFees", quote.getMemberFees());
            body.put("memberPlanNames", quote.getMemberPlanNames());
            body.put("membersTotal", quote.getTotal().subtract(quote.isFamilyHeadBilling() ? BigDecimal.ZERO : quote.getHeadFee()));
            body.put("total", quote.getTotal());
            return ResponseEntity.ok(body);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    @PostMapping("/purchase/{tenantSlug}/{branchId}")
    public ResponseEntity<String> purchaseFamilyPlan(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @RequestHeader("Payload-Fingerprint") String fingerprint,
            @RequestBody @Valid MobilePurchaseRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl user) {

        // Global profile first, in its own transaction, then drop the OSIV
        // EntityManager so the purchase gets a fresh one on the tenant's connection
        // (same sequence as MobileDiscoveryController.purchaseMembership).
        UserProfile profile = globalUserService.getUserProfileRequiresNew(user.getId());
        String gymName = globalDiscoveryRepository.findByTenantSlugAndBranchId(tenantSlug, branchId)
                .map(GlobalBranchDiscovery::getGymName).orElse(null);
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder emHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
        }

        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);

            MobileFamilyPurchaseService.PurchaseOutcome outcome = purchaseService.purchase(
                    idempotencyKey, fingerprint, request, user.getId(), user.getEmail(), profile, tenantSlug, gymName);

            // Committed — now it's safe to tell family members about it.
            for (MobileFamilyPurchaseService.InvitationEmail email : outcome.emails()) {
                invitationService.sendInvitationEmail(email.email(), email.name(), email.inviterName(),
                        gymName, email.planName());
            }
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(outcome.responseJson());
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }
}
