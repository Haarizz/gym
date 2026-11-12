package com.company.project.services.facedevice;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.FaceDevice;
import com.company.project.repositories.FaceDeviceRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Keeps face devices in step with member data, like the old per-minute PHP cron: every
 * minute, for the primary database and then each active tenant, every enabled device with
 * auto-sync on gets up to {@link FaceDeviceSyncService#SCHEDULED_BATCH} changed members.
 * Disable with face-device.sync.enabled=false.
 */
@Service
public class FaceDeviceScheduler {

    private static final Logger log = LoggerFactory.getLogger(FaceDeviceScheduler.class);

    private final FaceDeviceRepository deviceRepository;
    private final FaceDeviceSyncService syncService;
    private final TenantRepository tenantRepository;
    private final FaceDeviceReportService reportService;
    private final boolean enabled;

    public FaceDeviceScheduler(FaceDeviceRepository deviceRepository,
                               FaceDeviceSyncService syncService,
                               TenantRepository tenantRepository,
                               FaceDeviceReportService reportService,
                               @Value("${face-device.sync.enabled:true}") boolean enabled) {
        this.deviceRepository = deviceRepository;
        this.syncService = syncService;
        this.tenantRepository = tenantRepository;
        this.reportService = reportService;
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${face-device.sync.interval-ms:60000}", initialDelay = 120000)
    public void syncAllTenants() {
        if (!enabled) return;
        forEachDatabase(this::runForCurrentDatabase);
    }

    /**
     * Every 5 minutes: devices whose gym-local time has passed the report time
     * (face-device.report.time, default 23:30) and that haven't had today's report get it now.
     */
    @Scheduled(cron = "${face-device.report.cron:0 */5 * * * *}")
    public void sendDailyReports() {
        if (!enabled) return;
        forEachDatabase(label -> {
            try {
                reportService.sendDueReports();
            } catch (Exception e) {
                log.debug("Face device reports: skipped {}: {}", label, e.getMessage());
            }
        });
    }

    /** Runs {@code work} for the primary database, then with each active tenant's context set. */
    private void forEachDatabase(java.util.function.Consumer<String> work) {
        work.accept("primary");
        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Face device jobs: could not list tenants", e);
            return;
        }
        for (Tenant tenant : tenants) {
            if (tenant.getSlug() == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                work.accept(tenant.getSlug());
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void runForCurrentDatabase(String label) {
        List<FaceDevice> devices;
        try {
            devices = deviceRepository.findByEnabledTrueAndAutoSyncTrue();
        } catch (Exception e) {
            // e.g. a tenant whose catch-up hasn't created face_devices yet
            log.debug("Face device sync: no devices readable in {}: {}", label, e.getMessage());
            return;
        }
        for (FaceDevice d : devices) {
            try {
                syncService.runDevice(d.getId(), FaceDeviceSyncService.SCHEDULED_BATCH);
            } catch (Exception e) {
                log.error("Face device sync failed for device {} in {}", d.getId(), label, e);
            }
        }
    }
}
