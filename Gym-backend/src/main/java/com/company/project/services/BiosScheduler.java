package com.company.project.services;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.BiosSettings;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Sends the BiOS page's scheduled report emails and retention / revenue alert
 * emails — makes the "Schedule Report" and "Set Alerts" Quick Analytics Actions
 * (previously buttons with no onClick handler) actually do something.
 *
 * BiOS settings are per branch and every gym has its own database, so each job
 * runs once per configured branch of every gym: each ACTIVE tenant with a
 * connection when tenant routing is on, otherwise the primary database. The
 * primary database is skipped while routing is on — it still holds copies of
 * gyms already migrated to their own databases, which would otherwise get a
 * second, stale email.
 */
@Service
public class BiosScheduler {

    private static final Logger log = LoggerFactory.getLogger(BiosScheduler.class);
    private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy");
    private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy");
    private static final int SNAPSHOT_CATCH_UP_DAYS = 3;

    private final BiosService biosService;
    private final EmailService emailService;
    private final TenantRepository tenantRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public BiosScheduler(BiosService biosService,
                          EmailService emailService,
                          TenantRepository tenantRepository,
                          TenantDataSourceRegistry tenantDataSourceRegistry) {
        this.biosService = biosService;
        this.emailService = emailService;
        this.tenantRepository = tenantRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
    }

    /** A gym database to run against: tenantSlug null means the primary database. */
    record GymDatabase(String tenantSlug, String label) {}

    @FunctionalInterface
    interface BranchJob {
        void run(BiosSettings settings, LocalDate today);
    }

    /** Runs at 07:30 daily; sends each branch's summary on the day matching its configured frequency. */
    @Scheduled(cron = "${bios.cron.scheduled-report:0 30 7 * * *}")
    public void sendScheduledReports() {
        forEachConfiguredBranch("scheduled report", this::sendScheduledReport);
    }

    /** Runs at 08:00 daily; alerts when a branch's retention drops below its configured threshold. */
    @Scheduled(cron = "${bios.cron.retention-alert:0 0 8 * * *}")
    public void checkRetentionAlerts() {
        forEachConfiguredBranch("retention alert", this::checkRetentionAlert);
    }

    /**
     * Runs at 08:15 daily; alerts when a branch's month-to-date revenue, projected
     * to month-end at the current daily pace, is tracking to miss its
     * monthlyRevenueTarget by more than the configured threshold.
     */
    @Scheduled(cron = "${bios.cron.revenue-alert:0 15 8 * * *}")
    public void checkRevenueShortfallAlerts() {
        forEachConfiguredBranch("revenue shortfall alert", this::checkRevenueShortfallAlert);
    }

    /**
     * Runs at 00:30 daily; records last month's month-end member counts for every
     * active branch (feeds the BiOS member trend). Only in the first few days of
     * a month, so a missed run is retried but a much later capture — whose counts
     * would no longer describe the month end — is left to the estimate instead.
     * Needs no SMTP, unlike the email jobs.
     */
    @Scheduled(cron = "${bios.cron.monthly-snapshot:0 30 0 * * *}")
    public void captureMonthlySnapshots() {
        captureMonthlySnapshots(LocalDate.now());
    }

    void captureMonthlySnapshots(LocalDate today) {
        if (today.getDayOfMonth() > SNAPSHOT_CATCH_UP_DAYS) {
            return;
        }
        YearMonth lastMonth = YearMonth.from(today).minusMonths(1);
        forEachGymDatabase("monthly snapshot", gym -> {
            int written = 0;
            for (Long branchId : biosService.findActiveBranchIds()) {
                boolean[] wrote = { false };
                runForBranch("monthly snapshot", gym, branchId,
                        () -> wrote[0] = biosService.captureMonthlySnapshot(branchId, lastMonth));
                if (wrote[0]) written++;
            }
            if (written > 0) log.info("BiOS: recorded {} member snapshot(s) for {} in {}", written, lastMonth, gym.label());
        });
    }

    // ── Per-branch jobs ───────────────────────────────────────────────────────

    void sendScheduledReport(BiosSettings settings, LocalDate today) {
        if (!Boolean.TRUE.equals(settings.getScheduleEnabled()) || !StringUtils.hasText(settings.getScheduleEmail())) {
            return;
        }
        boolean monthly = "MONTHLY".equals(settings.getScheduleFrequency());
        boolean isDue = monthly ? today.getDayOfMonth() == 1 : today.getDayOfWeek().getValue() == 1; // Monday
        if (!isDue) {
            return;
        }

        // The report covers the period that just ended: last calendar month, or the last 7 days.
        LocalDate periodStart = monthly ? today.minusMonths(1) : today.minusDays(7);
        String periodLabel = monthly
                ? periodStart.format(PERIOD_FORMAT)
                : periodStart.format(DAY_FORMAT) + " – " + today.minusDays(1).format(DAY_FORMAT);

        BiosService.BranchSnapshot snapshot = biosService.branchSnapshot(settings.getBranchId(), periodStart, today);
        Map<String, Object> dashboard = biosService.branchFinancialDashboard(settings.getBranchId());
        String branch = HtmlUtils.htmlEscape(snapshot.branchName());

        String html = "<h2>BiOS Business Summary - " + branch + "</h2>"
                + "<p>" + periodLabel + "</p>"
                + "<p>Revenue for the period: <b>" + snapshot.revenue() + "</b></p>"
                + "<p>Active Members: <b>" + snapshot.activeMembers() + "</b> of " + snapshot.totalMembers() + "</p>"
                + "<p>Retention Rate: <b>" + snapshot.retentionPercent() + "%</b></p>"
                + "<p>Net Income (all time): <b>" + dashboard.get("net_income") + "</b></p>"
                + "<p>Profit Margin (all time): <b>" + dashboard.get("profit_margin") + "%</b></p>";

        send(settings.getScheduleEmail(), "BiOS Business Summary - " + snapshot.branchName() + " - " + periodLabel, html);
    }

    void checkRetentionAlert(BiosSettings settings, LocalDate today) {
        if (!Boolean.TRUE.equals(settings.getAlertEnabled()) || !StringUtils.hasText(settings.getAlertEmail())) {
            return;
        }
        BiosService.BranchSnapshot snapshot = biosService.branchSnapshot(settings.getBranchId(), today, today);
        if (snapshot.totalMembers() == 0) {
            return;
        }
        double threshold = settings.getAlertRetentionThreshold() != null ? settings.getAlertRetentionThreshold() : 80.0;
        if (snapshot.retentionPercent() >= threshold) {
            return;
        }

        String html = "<h2>BiOS Alert: Retention Below Threshold - " + HtmlUtils.htmlEscape(snapshot.branchName()) + "</h2>"
                + "<p>Current retention rate is <b>" + snapshot.retentionPercent() + "%</b> ("
                + snapshot.activeMembers() + " of " + snapshot.totalMembers() + " members active), "
                + "which is below your configured threshold of <b>" + threshold + "%</b>.</p>";

        send(settings.getAlertEmail(), "BiOS Alert: Retention Rate Below Threshold - " + snapshot.branchName(), html);
    }

    void checkRevenueShortfallAlert(BiosSettings settings, LocalDate today) {
        if (!Boolean.TRUE.equals(settings.getRevenueAlertEnabled()) || !StringUtils.hasText(settings.getAlertEmail())) {
            return;
        }
        BigDecimal target = settings.getMonthlyRevenueTarget();
        if (target == null || target.signum() <= 0) {
            return;
        }
        int dayOfMonth = today.getDayOfMonth();
        // Too early in the month for a pace projection to mean anything.
        if (dayOfMonth < 3) {
            return;
        }

        BiosService.BranchSnapshot snapshot = biosService.branchSnapshot(
                settings.getBranchId(), today.withDayOfMonth(1), today.plusDays(1));
        BigDecimal monthToDate = snapshot.revenue();
        BigDecimal projected = monthToDate
                .multiply(BigDecimal.valueOf(today.lengthOfMonth()))
                .divide(BigDecimal.valueOf(dayOfMonth), 2, RoundingMode.HALF_UP);

        double thresholdPercent = settings.getRevenueAlertThresholdPercent() != null ? settings.getRevenueAlertThresholdPercent() : 90.0;
        BigDecimal requiredFloor = target
                .multiply(BigDecimal.valueOf(thresholdPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (projected.compareTo(requiredFloor) >= 0) {
            return;
        }

        String period = today.format(PERIOD_FORMAT);
        String html = "<h2>BiOS Alert: Revenue Pace Below Target - " + HtmlUtils.htmlEscape(snapshot.branchName()) + "</h2>"
                + "<p>Month-to-date revenue for " + period + " is <b>" + monthToDate + "</b>.</p>"
                + "<p>At the current daily pace, month-end revenue is projected at <b>" + projected + "</b>, "
                + "which is below <b>" + thresholdPercent + "%</b> of your monthly target of "
                + "<b>" + target + "</b>.</p>";

        send(settings.getAlertEmail(), "BiOS Alert: Revenue Pace Below Target - " + snapshot.branchName(), html);
    }

    // ── Tenant / branch iteration ─────────────────────────────────────────────

    void forEachConfiguredBranch(String jobName, BranchJob job) {
        if (!emailService.isConfigured()) {
            log.warn("Skipped BiOS {} - SMTP is not configured.", jobName);
            return;
        }
        LocalDate today = LocalDate.now();
        forEachGymDatabase(jobName, gym -> {
            for (BiosSettings settings : biosService.findBranchesWithSchedulesOrAlerts()) {
                runForBranch(jobName, gym, settings.getBranchId(), () -> job.run(settings, today));
            }
        });
    }

    /** Runs `work` with each gym database's tenant in context; one failing database doesn't stop the rest. */
    void forEachGymDatabase(String jobName, Consumer<GymDatabase> work) {
        for (GymDatabase gym : gymDatabases()) {
            try {
                TenantContextHolder.setCurrentTenant(gym.tenantSlug());
                work.accept(gym);
            } catch (Exception ex) {
                log.error("BiOS {} failed for {}", jobName, gym.label(), ex);
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void runForBranch(String jobName, GymDatabase gym, Long branchId, Runnable work) {
        try {
            BranchContextHolder.setActiveBranchId(branchId);
            work.run();
        } catch (Exception ex) {
            log.error("BiOS {} failed for branch {} in {}", jobName, branchId, gym.label(), ex);
        } finally {
            BranchContextHolder.clear();
        }
    }

    List<GymDatabase> gymDatabases() {
        List<GymDatabase> databases = new ArrayList<>();
        if (!tenantRoutingEnabled) {
            databases.add(new GymDatabase(null, "primary"));
            return databases;
        }
        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception ex) {
            log.error("BiOS: could not list tenants", ex);
            return databases;
        }
        for (Tenant tenant : tenants) {
            String slug = tenant.getSlug();
            if (slug == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
                continue;
            }
            // Without a connection TenantRoutingDataSource silently falls back to the
            // primary database, so only the default tenant (which lives there) may run without one.
            if (slug.equals(defaultTenantSlug) || tenantDataSourceRegistry.hasConnection(slug)) {
                databases.add(new GymDatabase(slug, "tenant " + slug));
            }
        }
        return databases;
    }

    private void send(String to, String subject, String html) {
        try {
            emailService.sendEmail(to, subject, html);
        } catch (Exception ex) {
            log.error("Failed to send BiOS email '{}' to {}", subject, to, ex);
        }
    }
}
