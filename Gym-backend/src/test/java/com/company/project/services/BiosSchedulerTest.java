package com.company.project.services;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.BiosSettings;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiosSchedulerTest {

    @Mock private BiosService biosService;
    @Mock private EmailService emailService;
    @Mock private TenantRepository tenantRepository;
    @Mock private TenantDataSourceRegistry tenantDataSourceRegistry;

    @InjectMocks
    private BiosScheduler scheduler;

    @BeforeEach
    void routingOn() {
        ReflectionTestUtils.setField(scheduler, "tenantRoutingEnabled", true);
        ReflectionTestUtils.setField(scheduler, "defaultTenantSlug", "default");
    }

    private static Tenant tenant(String slug, String status) {
        Tenant t = new Tenant(slug, slug);
        t.setStatus(status);
        return t;
    }

    private static BiosSettings settings(long branchId) {
        BiosSettings s = new BiosSettings();
        s.setBranchId(branchId);
        return s;
    }

    @Test
    void routingOnRunsEveryActiveConnectedTenantAndNeverThePrimaryCopy() {
        when(tenantRepository.findAll()).thenReturn(List.of(
                tenant("acme", "ACTIVE"),
                tenant("halfway", "PROVISIONING"),
                tenant("orphan", "ACTIVE"),
                tenant("default", "ACTIVE"),
                tenant("zen", "active")));
        when(tenantDataSourceRegistry.hasConnection("acme")).thenReturn(true);
        when(tenantDataSourceRegistry.hasConnection("orphan")).thenReturn(false);
        when(tenantDataSourceRegistry.hasConnection("zen")).thenReturn(true);

        List<String> slugs = scheduler.gymDatabases().stream().map(BiosScheduler.GymDatabase::tenantSlug).toList();

        // "orphan" has no connection, so routing would silently fall back to the primary DB.
        assertEquals(List.of("acme", "default", "zen"), slugs);
    }

    @Test
    void routingOffRunsOnlyThePrimaryDatabase() {
        ReflectionTestUtils.setField(scheduler, "tenantRoutingEnabled", false);

        List<BiosScheduler.GymDatabase> databases = scheduler.gymDatabases();

        assertEquals(1, databases.size());
        assertNull(databases.get(0).tenantSlug());
        verifyNoInteractions(tenantRepository);
    }

    @Test
    void eachBranchRunsInsideItsOwnTenantAndBranchContextAndOneFailureDoesNotStopTheRest() {
        when(emailService.isConfigured()).thenReturn(true);
        when(tenantRepository.findAll()).thenReturn(List.of(tenant("acme", "ACTIVE"), tenant("zen", "ACTIVE")));
        when(tenantDataSourceRegistry.hasConnection(anyString())).thenReturn(true);
        // Settings are loaded per tenant database, so the answer depends on the tenant in context.
        when(biosService.findBranchesWithSchedulesOrAlerts()).thenAnswer(inv ->
                "acme".equals(TenantContextHolder.getCurrentTenant())
                        ? List.of(settings(1), settings(2))
                        : List.of(settings(7)));

        List<String> seen = new ArrayList<>();
        scheduler.forEachConfiguredBranch("test job", (s, today) -> {
            seen.add(TenantContextHolder.getCurrentTenant() + ":" + BranchContextHolder.getActiveBranchId());
            if (s.getBranchId() == 1) {
                throw new IllegalStateException("boom");
            }
        });

        assertEquals(List.of("acme:1", "acme:2", "zen:7"), seen);
        assertNull(TenantContextHolder.getCurrentTenant());
        assertNull(BranchContextHolder.getActiveBranchId());
    }

    @Test
    void monthlySnapshotsRecordLastMonthForEveryActiveBranchOfEveryGymWithoutNeedingSmtp() {
        when(tenantRepository.findAll()).thenReturn(List.of(tenant("acme", "ACTIVE"), tenant("zen", "ACTIVE")));
        when(tenantDataSourceRegistry.hasConnection(anyString())).thenReturn(true);
        when(biosService.findActiveBranchIds()).thenAnswer(inv ->
                "acme".equals(TenantContextHolder.getCurrentTenant()) ? List.of(1L, 2L) : List.of(9L));
        List<String> seen = new ArrayList<>();
        when(biosService.captureMonthlySnapshot(org.mockito.ArgumentMatchers.anyLong(), eq(YearMonth.of(2026, 9))))
                .thenAnswer(inv -> {
                    seen.add(TenantContextHolder.getCurrentTenant() + ":" + BranchContextHolder.getActiveBranchId());
                    return true;
                });

        scheduler.captureMonthlySnapshots(LocalDate.of(2026, 10, 2));

        assertEquals(List.of("acme:1", "acme:2", "zen:9"), seen);
        verifyNoInteractions(emailService);
        assertNull(TenantContextHolder.getCurrentTenant());
        assertNull(BranchContextHolder.getActiveBranchId());
    }

    @Test
    void monthlySnapshotsAreLeftToTheEstimateAfterTheFirstFewDays() {
        scheduler.captureMonthlySnapshots(LocalDate.of(2026, 10, 4));

        verifyNoInteractions(tenantRepository, biosService);
    }

    @Test
    void noSmtpMeansNoTenantOrSettingsLookups() {
        when(emailService.isConfigured()).thenReturn(false);

        scheduler.checkRetentionAlerts();

        verifyNoInteractions(tenantRepository, biosService);
    }

    @Test
    void retentionAlertUsesTheBranchSnapshotAndItsOwnThreshold() {
        BiosSettings s = settings(3);
        s.setAlertEnabled(true);
        s.setAlertEmail("owner@gym.test");
        s.setAlertRetentionThreshold(75.0);
        LocalDate today = LocalDate.of(2026, 10, 12);
        when(biosService.branchSnapshot(3L, today, today))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 10, 7, 70.0, BigDecimal.ZERO));

        scheduler.checkRetentionAlert(s, today);

        verify(emailService).sendEmail(eq("owner@gym.test"), contains("Downtown"), contains("70.0%"));
    }

    @Test
    void retentionAboveThresholdSendsNothing() {
        BiosSettings s = settings(3);
        s.setAlertEnabled(true);
        s.setAlertEmail("owner@gym.test");
        s.setAlertRetentionThreshold(60.0);
        LocalDate today = LocalDate.of(2026, 10, 12);
        when(biosService.branchSnapshot(3L, today, today))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 10, 7, 70.0, BigDecimal.ZERO));

        scheduler.checkRetentionAlert(s, today);

        verify(emailService, never()).sendEmail(anyString(), anyString(), anyString());
    }

    @Test
    void revenueAlertProjectsMonthToDateRevenueThroughToday() {
        BiosSettings s = settings(4);
        s.setRevenueAlertEnabled(true);
        s.setAlertEmail("owner@gym.test");
        s.setMonthlyRevenueTarget(new BigDecimal("31000"));
        s.setRevenueAlertThresholdPercent(90.0);
        LocalDate today = LocalDate.of(2026, 10, 10); // 31-day month
        // 8,000 in 10 days projects to 24,800 — below 90% of 31,000 (27,900).
        when(biosService.branchSnapshot(4L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 11)))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 0, 0, 0, new BigDecimal("8000")));

        scheduler.checkRevenueShortfallAlert(s, today);

        verify(emailService).sendEmail(eq("owner@gym.test"), contains("Downtown"), contains("24800.00"));
    }

    @Test
    void revenueOnPaceSendsNothing() {
        BiosSettings s = settings(4);
        s.setRevenueAlertEnabled(true);
        s.setAlertEmail("owner@gym.test");
        s.setMonthlyRevenueTarget(new BigDecimal("31000"));
        s.setRevenueAlertThresholdPercent(90.0);
        LocalDate today = LocalDate.of(2026, 10, 10);
        when(biosService.branchSnapshot(4L, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 11)))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 0, 0, 0, new BigDecimal("9500")));

        scheduler.checkRevenueShortfallAlert(s, today);

        verify(emailService, never()).sendEmail(anyString(), anyString(), anyString());
    }

    @Test
    void weeklyReportGoesOutOnMondayAndCoversThePreviousSevenDays() {
        BiosSettings s = settings(5);
        s.setScheduleEnabled(true);
        s.setScheduleEmail("owner@gym.test");
        s.setScheduleFrequency("WEEKLY");
        LocalDate monday = LocalDate.of(2026, 10, 12);
        when(biosService.branchSnapshot(5L, LocalDate.of(2026, 10, 5), monday))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 20, 15, 75.0, new BigDecimal("12000")));
        when(biosService.branchFinancialDashboard(5L)).thenReturn(Map.of("net_income", 1, "profit_margin", 2));

        scheduler.sendScheduledReport(s, monday);
        scheduler.sendScheduledReport(s, monday.plusDays(1));

        verify(emailService).sendEmail(eq("owner@gym.test"), contains("Downtown"), contains("12000"));
    }

    @Test
    void monthlyReportOnTheFirstCoversLastCalendarMonth() {
        BiosSettings s = settings(5);
        s.setScheduleEnabled(true);
        s.setScheduleEmail("owner@gym.test");
        s.setScheduleFrequency("MONTHLY");
        LocalDate first = LocalDate.of(2026, 11, 1);
        when(biosService.branchSnapshot(5L, LocalDate.of(2026, 10, 1), first))
                .thenReturn(new BiosService.BranchSnapshot("Downtown", 20, 15, 75.0, new BigDecimal("50000")));
        when(biosService.branchFinancialDashboard(5L)).thenReturn(Map.of());

        scheduler.sendScheduledReport(s, first);

        verify(emailService).sendEmail(eq("owner@gym.test"), contains("October 2026"), contains("50000"));
    }
}
