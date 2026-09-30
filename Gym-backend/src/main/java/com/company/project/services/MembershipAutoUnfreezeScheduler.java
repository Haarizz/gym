package com.company.project.services;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ends freezes that have reached their end date, for plans with "Auto Unfreeze on
 * End Date" enabled. Runs hourly; the membership is extended by the planned freeze
 * length, not by however late this job catches it.
 *
 * Unlike the other schedulers this runs for every gym: first the primary database
 * (no tenant context), then each active tenant's own database. Each member is
 * unfrozen in its own transaction so one failure doesn't hold up the rest.
 */
@Service
public class MembershipAutoUnfreezeScheduler {

    private static final Logger log = LoggerFactory.getLogger(MembershipAutoUnfreezeScheduler.class);

    private final MembershipFreezeService freezeService;
    private final TenantRepository tenantRepository;

    public MembershipAutoUnfreezeScheduler(MembershipFreezeService freezeService,
                                           TenantRepository tenantRepository) {
        this.freezeService = freezeService;
        this.tenantRepository = tenantRepository;
    }

    @Scheduled(cron = "0 15 * * * *")
    public void autoUnfreezeAllTenants() {
        runForCurrentDatabase("primary");

        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Auto-unfreeze: could not list tenants", e);
            return;
        }
        for (Tenant tenant : tenants) {
            if (tenant.getSlug() == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                runForCurrentDatabase(tenant.getSlug());
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void runForCurrentDatabase(String label) {
        LocalDateTime now = LocalDateTime.now();
        List<Long> due;
        try {
            due = freezeService.findDueForAutoUnfreeze(now);
        } catch (Exception e) {
            log.error("Auto-unfreeze: could not load frozen members for {}", label, e);
            return;
        }
        int unfrozen = 0;
        for (Long memberId : due) {
            try {
                if (freezeService.autoUnfreeze(memberId, now)) unfrozen++;
            } catch (Exception e) {
                log.error("Auto-unfreeze failed for member {} in {}", memberId, label, e);
            }
        }
        if (unfrozen > 0) log.info("Auto-unfroze {} membership(s) in {}", unfrozen, label);
    }
}
