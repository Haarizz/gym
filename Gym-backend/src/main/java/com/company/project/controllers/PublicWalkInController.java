package com.company.project.controllers;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.LeadFormRateLimiter;
import com.company.project.dto.WalkInSelfRegistrationDTOs.PublicPage;
import com.company.project.dto.WalkInSelfRegistrationDTOs.PublicSubmission;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.ClientIpResolver;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.WalkInRegistrationService;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.function.Supplier;

/**
 * Unauthenticated side of walk-in self-registration — the /w/{tenant}/{branch}
 * page a visitor reaches by scanning the gym's or a staff member's QR. permitAll
 * in SecurityConfig. The tenant + branch come straight from the path (they're
 * already public through mobile discovery); a branch only answers once its
 * "walk-in self-registration" switch is on, and a submission only queues the
 * visitor for staff — it never grants entry.
 */
@RestController
@RequestMapping("/api/public/walk-in")
public class PublicWalkInController {

    private static final String SUCCESS_MESSAGE =
            "You're registered! Please show this screen at reception to pay and check in.";

    private final WalkInRegistrationService registrationService;
    private final LeadFormRateLimiter rateLimiter;
    private final TenantRepository tenantRepository;
    private final EntityManagerFactory entityManagerFactory;

    public PublicWalkInController(WalkInRegistrationService registrationService,
                                  LeadFormRateLimiter rateLimiter,
                                  TenantRepository tenantRepository,
                                  EntityManagerFactory entityManagerFactory) {
        this.registrationService = registrationService;
        this.rateLimiter = rateLimiter;
        this.tenantRepository = tenantRepository;
        this.entityManagerFactory = entityManagerFactory;
    }

    /** GET /api/public/walk-in/{tenantSlug}/{branchId}?s=staffCode */
    @GetMapping("/{tenantSlug}/{branchId}")
    public ResponseEntity<PublicPage> getPage(@PathVariable String tenantSlug,
                                              @PathVariable Long branchId,
                                              @RequestParam(name = "s", required = false) String staffCode) {
        Tenant tenant = activeTenant(tenantSlug);
        return ResponseEntity.ok(inTenant(tenantSlug, branchId,
                () -> registrationService.describe(branchId, tenant.getName(), staffCode)));
    }

    /** POST /api/public/walk-in/{tenantSlug}/{branchId}/submit */
    @PostMapping("/{tenantSlug}/{branchId}/submit")
    public ResponseEntity<Map<String, Object>> submit(@PathVariable String tenantSlug,
                                                      @PathVariable Long branchId,
                                                      @RequestBody PublicSubmission request,
                                                      HttpServletRequest httpRequest) {
        // Same per-IP / per-target budget as the public lead forms, keyed per branch.
        if (!rateLimiter.tryAcquire(ClientIpResolver.resolve(httpRequest), "walk-in:" + tenantSlug + ":" + branchId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many requests. Please try again later."));
        }
        activeTenant(tenantSlug);
        if (request.website() != null && !request.website().isBlank()) {
            // Honeypot tripped — pretend success so the bot doesn't adapt, persist nothing.
            return ResponseEntity.ok(Map.of("success", true, "message", SUCCESS_MESSAGE));
        }
        inTenant(tenantSlug, branchId, () -> {
            registrationService.submit(branchId, request);
            return null;
        });
        return ResponseEntity.ok(Map.of("success", true, "message", SUCCESS_MESSAGE));
    }

    private Tenant activeTenant(String tenantSlug) {
        return tenantRepository.findBySlug(tenantSlug)
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .orElseThrow(() -> new EntityNotFoundException("Self-registration isn't available here"));
    }

    private <T> T inTenant(String tenantSlug, Long branchId, Supplier<T> work) {
        // Drop any OSIV EntityManager already bound to this request so the tenant
        // work below opens a fresh one on the tenant's DataSource (same step as
        // PublicLeadFormController / MobileDiscoveryController).
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder emHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
        }
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);
            return work.get();
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }
}
