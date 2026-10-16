package com.company.project.services;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Runs at 00:01 every day to auto-close any sessions that were left open
 * (e.g. member forgot to check out, device went offline). Member visits are
 * closed at check-in + {@link AttendanceSessionService#STALE_SESSION_MAX_MINUTES};
 * staff shifts at 23:59 of the shift's start day.
 *
 * Runs for every gym: first the primary database (no tenant context), then each
 * active tenant's own database, each in its own transaction.
 */
@Service
public class AttendanceScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceScheduler.class);

    private final AttendanceSessionService sessionService;
    private final TenantRepository tenantRepository;

    public AttendanceScheduler(AttendanceSessionService sessionService,
                               TenantRepository tenantRepository) {
        this.sessionService   = sessionService;
        this.tenantRepository = tenantRepository;
    }

    /** Runs at 00:01 every day */
    @Scheduled(cron = "0 1 0 * * *")
    public void autoCloseOpenSessions() {
        runForCurrentDatabase("primary");

        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Attendance auto-close: could not list tenants", e);
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
        try {
            int closed = sessionService.closeStaleSessions();
            if (closed > 0) log.info("Auto-closed {} open session(s) in {}", closed, label);
        } catch (Exception e) {
            log.error("Attendance auto-close failed for {}", label, e);
        }
    }
}
