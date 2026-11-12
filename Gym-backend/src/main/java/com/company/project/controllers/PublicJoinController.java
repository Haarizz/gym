package com.company.project.controllers;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.LeadFormRateLimiter;
import com.company.project.dto.MembershipApplicationDTOs.ApplicationReceipt;
import com.company.project.dto.MembershipApplicationDTOs.PublicApplication;
import com.company.project.dto.MembershipApplicationDTOs.PublicCatalog;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.ClientIpResolver;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.ServicePortfolioService;
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
 * Unauthenticated side of the Service Portfolios share link
 * (/join/{tenant}/{branch}/{token}). permitAll in SecurityConfig. The branch only
 * answers when the token matches its current share token, and an application only
 * queues the visitor for staff approval — it never creates a member by itself.
 */
@RestController
@RequestMapping("/api/public/join")
public class PublicJoinController {

    private final ServicePortfolioService portfolioService;
    private final LeadFormRateLimiter rateLimiter;
    private final TenantRepository tenantRepository;
    private final EntityManagerFactory entityManagerFactory;

    public PublicJoinController(ServicePortfolioService portfolioService,
                                LeadFormRateLimiter rateLimiter,
                                TenantRepository tenantRepository,
                                EntityManagerFactory entityManagerFactory) {
        this.portfolioService = portfolioService;
        this.rateLimiter = rateLimiter;
        this.tenantRepository = tenantRepository;
        this.entityManagerFactory = entityManagerFactory;
    }

    /** GET /api/public/join/{tenantSlug}/{branchId}/{token} */
    @GetMapping("/{tenantSlug}/{branchId}/{token}")
    public ResponseEntity<PublicCatalog> catalog(@PathVariable String tenantSlug,
                                                 @PathVariable Long branchId,
                                                 @PathVariable String token) {
        Tenant tenant = activeTenant(tenantSlug);
        return ResponseEntity.ok(inTenant(tenantSlug, branchId,
                () -> portfolioService.describe(branchId, token, tenant.getName())));
    }

    /** POST /api/public/join/{tenantSlug}/{branchId}/{token}/apply */
    @PostMapping("/{tenantSlug}/{branchId}/{token}/apply")
    public ResponseEntity<?> apply(@PathVariable String tenantSlug,
                                   @PathVariable Long branchId,
                                   @PathVariable String token,
                                   @RequestBody PublicApplication request,
                                   HttpServletRequest httpRequest) {
        // Same per-IP / per-target budget as the public lead forms, keyed per branch.
        if (!rateLimiter.tryAcquire(ClientIpResolver.resolve(httpRequest), "join:" + tenantSlug + ":" + branchId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many attempts. Please try again later."));
        }
        activeTenant(tenantSlug);
        if (request.website() != null && !request.website().isBlank()) {
            // Honeypot tripped — pretend nothing happened and save nothing.
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Something went wrong. Please try again."));
        }
        ApplicationReceipt receipt = inTenant(tenantSlug, branchId,
                () -> portfolioService.apply(branchId, token, request));
        return ResponseEntity.ok(receipt);
    }

    private Tenant activeTenant(String tenantSlug) {
        return tenantRepository.findBySlug(tenantSlug)
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .orElseThrow(() -> new EntityNotFoundException("This link isn't available"));
    }

    private <T> T inTenant(String tenantSlug, Long branchId, Supplier<T> work) {
        // The request's open-in-view EntityManager may already be pinned to the global DB
        // (activeTenant ran first), so set it aside and give the tenant work a fresh one.
        // Afterwards put the original back: OpenEntityManagerInViewInterceptor unbinds it
        // when the request ends and throws "No value for key ... bound to thread" if it's
        // gone (same pattern as MobileDiscoveryController.inTenant).
        EntityManagerHolder requestEmHolder = TransactionSynchronizationManager.hasResource(entityManagerFactory)
                ? (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory)
                : null;
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);
            TransactionSynchronizationManager.bindResource(entityManagerFactory,
                    new EntityManagerHolder(entityManagerFactory.createEntityManager()));
            return work.get();
        } finally {
            if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
                EntityManagerHolder tenantEmHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
                EntityManagerFactoryUtils.closeEntityManager(tenantEmHolder.getEntityManager());
            }
            if (requestEmHolder != null) {
                TransactionSynchronizationManager.bindResource(entityManagerFactory, requestEmHolder);
            }
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }
}
