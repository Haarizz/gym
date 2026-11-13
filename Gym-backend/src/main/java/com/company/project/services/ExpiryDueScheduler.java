package com.company.project.services;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Raises expiry dues ({@link ExpiryDueService}) just after midnight — a membership whose
 * last day was yesterday is expired from today — and once on startup to catch up on a
 * missed night. Primary database first, then every active gym's database; each member
 * in its own transaction so one bad record can't block the rest.
 */
@Component
public class ExpiryDueScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExpiryDueScheduler.class);

    private final ExpiryDueService expiryDueService;
    private final TenantRepository tenantRepository;

    public ExpiryDueScheduler(ExpiryDueService expiryDueService, TenantRepository tenantRepository) {
        this.expiryDueService = expiryDueService;
        this.tenantRepository = tenantRepository;
    }

    @Scheduled(cron = "0 5 0 * * *")
    public void raiseExpiryDues() {
        forEachDatabase();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void raiseOnStartup() {
        Thread t = new Thread(this::forEachDatabase, "expiry-dues-catchup");
        t.setDaemon(true);
        t.start();
    }

    private void forEachDatabase() {
        runFor("primary");
        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Expiry dues: could not list tenants", e);
            return;
        }
        for (Tenant tenant : tenants) {
            if (tenant.getSlug() == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                runFor(tenant.getSlug());
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void runFor(String label) {
        try {
            int cleared = expiryDueService.cancelDayPassDues();
            if (cleared > 0) log.info("Cancelled {} day-pass expiry due(s) in {}", cleared, label);
        } catch (Exception e) {
            log.error("Expiry dues: could not clear day-pass dues in {}", label, e);
        }
        List<Long> ids;
        try {
            ids = expiryDueService.findCandidateIds();
        } catch (Exception e) {
            log.error("Expiry dues: could not list expired members in {}", label, e);
            return;
        }
        int raised = 0;
        for (Long id : ids) {
            try {
                if (expiryDueService.raiseDueFor(id)) raised++;
            } catch (Exception e) {
                log.error("Expiry dues: member {} in {} failed", id, label, e);
            }
        }
        if (raised > 0) log.info("Raised {} expiry due(s) in {}", raised, label);
    }
}
