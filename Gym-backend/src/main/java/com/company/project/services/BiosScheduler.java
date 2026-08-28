package com.company.project.services;

import com.company.project.dto.BiosSettingsDTO;
import com.company.project.entities.Receipt;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Sends the BiOS page's scheduled report emails and retention-alert emails —
 * makes the "Schedule Report" and "Set Alerts" Quick Analytics Actions
 * (previously buttons with no onClick handler) actually do something.
 */
@Service
public class BiosScheduler {

    private static final Logger log = LoggerFactory.getLogger(BiosScheduler.class);

    private final BiosService biosService;
    private final MemberRepository memberRepository;
    private final FinancialAnalyticsService financialAnalyticsService;
    private final EmailService emailService;
    private final ReceiptRepository receiptRepository;

    public BiosScheduler(BiosService biosService,
                          MemberRepository memberRepository,
                          FinancialAnalyticsService financialAnalyticsService,
                          EmailService emailService,
                          ReceiptRepository receiptRepository) {
        this.biosService = biosService;
        this.memberRepository = memberRepository;
        this.financialAnalyticsService = financialAnalyticsService;
        this.emailService = emailService;
        this.receiptRepository = receiptRepository;
    }

    /** Sum of paid receipts from the start of the current month up to (not including) `asOf`. */
    private BigDecimal monthToDateRevenue(LocalDateTime asOf) {
        LocalDateTime monthStart = asOf.toLocalDate().withDayOfMonth(1).atStartOfDay();
        return receiptRepository.findAll().stream()
                .filter(r -> "Paid".equals(r.getStatus()))
                .filter(r -> {
                    LocalDateTime when = r.getTransactionDate() != null ? r.getTransactionDate() : r.getCreatedAt();
                    return when != null && !when.isBefore(monthStart) && when.isBefore(asOf);
                })
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private double retentionRate() {
        long totalMembers = memberRepository.count();
        if (totalMembers == 0) {
            return 0;
        }
        long activeMembers = memberRepository.countByMembershipStatus("active");
        return BigDecimal.valueOf(activeMembers)
                .divide(BigDecimal.valueOf(totalMembers), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /** Runs at 07:30 daily; sends the BiOS summary on the day matching the configured frequency. */
    @Scheduled(cron = "0 30 7 * * *")
    public void sendScheduledReport() {
        BiosSettingsDTO settings = biosService.getSettings();
        if (!Boolean.TRUE.equals(settings.getScheduleEnabled()) || !StringUtils.hasText(settings.getScheduleEmail())) {
            return;
        }

        LocalDate today = LocalDate.now();
        boolean isDue = "MONTHLY".equals(settings.getScheduleFrequency())
                ? today.getDayOfMonth() == 1
                : today.getDayOfWeek().getValue() == 1; // Monday
        if (!isDue) {
            return;
        }
        if (!emailService.isConfigured()) {
            log.warn("Skipped BiOS scheduled report — SMTP is not configured.");
            return;
        }

        Map<String, Object> dashboard = financialAnalyticsService.getDashboard();
        long totalMembers = memberRepository.count();
        long activeMembers = memberRepository.countByMembershipStatus("active");
        double retention = retentionRate();

        String period = today.format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        String html = "<h2>BiOS Business Summary - " + period + "</h2>"
                + "<p>Total Revenue: <b>" + dashboard.get("total_revenue") + "</b></p>"
                + "<p>Net Income: <b>" + dashboard.get("net_income") + "</b></p>"
                + "<p>Profit Margin: <b>" + dashboard.get("profit_margin") + "%</b></p>"
                + "<p>Active Members: <b>" + activeMembers + "</b> of " + totalMembers + "</p>"
                + "<p>Retention Rate: <b>" + retention + "%</b></p>";

        try {
            emailService.sendEmail(settings.getScheduleEmail(), "BiOS Business Summary - " + period, html);
        } catch (Exception ex) {
            log.error("Failed to send BiOS scheduled report to {}", settings.getScheduleEmail(), ex);
        }
    }

    /** Runs at 08:00 daily; alerts when retention drops below the configured threshold. */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkRetentionAlert() {
        BiosSettingsDTO settings = biosService.getSettings();
        if (!Boolean.TRUE.equals(settings.getAlertEnabled()) || !StringUtils.hasText(settings.getAlertEmail())) {
            return;
        }
        if (!emailService.isConfigured()) {
            log.warn("Skipped BiOS retention alert - SMTP is not configured.");
            return;
        }

        double retention = retentionRate();
        double threshold = settings.getAlertRetentionThreshold() != null ? settings.getAlertRetentionThreshold() : 80.0;
        if (retention >= threshold) {
            return;
        }

        String html = "<h2>BiOS Alert: Retention Below Threshold</h2>"
                + "<p>Current retention rate is <b>" + retention + "%</b>, which is below your configured threshold of "
                + "<b>" + threshold + "%</b>.</p>";

        try {
            emailService.sendEmail(settings.getAlertEmail(), "BiOS Alert: Retention Rate Below Threshold", html);
        } catch (Exception ex) {
            log.error("Failed to send BiOS retention alert to {}", settings.getAlertEmail(), ex);
        }
    }

    /**
     * Runs at 08:15 daily; alerts when month-to-date revenue, projected to
     * month-end at the current daily pace, is tracking to miss monthlyRevenueTarget
     * by more than the configured threshold.
     */
    @Scheduled(cron = "0 15 8 * * *")
    public void checkRevenueShortfallAlert() {
        BiosSettingsDTO settings = biosService.getSettings();
        if (!Boolean.TRUE.equals(settings.getRevenueAlertEnabled()) || !StringUtils.hasText(settings.getAlertEmail())) {
            return;
        }
        if (settings.getMonthlyRevenueTarget() == null || settings.getMonthlyRevenueTarget().signum() <= 0) {
            return;
        }
        if (!emailService.isConfigured()) {
            log.warn("Skipped BiOS revenue shortfall alert - SMTP is not configured.");
            return;
        }

        LocalDate today = LocalDate.now();
        int dayOfMonth = today.getDayOfMonth();
        int daysInMonth = today.lengthOfMonth();
        // Too early in the month for a pace projection to mean anything.
        if (dayOfMonth < 3) {
            return;
        }

        BigDecimal monthToDate = monthToDateRevenue(LocalDateTime.now());
        BigDecimal projected = monthToDate
                .multiply(BigDecimal.valueOf(daysInMonth))
                .divide(BigDecimal.valueOf(dayOfMonth), 2, RoundingMode.HALF_UP);

        double thresholdPercent = settings.getRevenueAlertThresholdPercent() != null ? settings.getRevenueAlertThresholdPercent() : 90.0;
        BigDecimal requiredFloor = settings.getMonthlyRevenueTarget()
                .multiply(BigDecimal.valueOf(thresholdPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        if (projected.compareTo(requiredFloor) >= 0) {
            return;
        }

        String period = today.format(DateTimeFormatter.ofPattern("MMMM yyyy"));
        String html = "<h2>BiOS Alert: Revenue Pace Below Target</h2>"
                + "<p>Month-to-date revenue for " + period + " is <b>" + monthToDate + "</b>.</p>"
                + "<p>At the current daily pace, month-end revenue is projected at <b>" + projected + "</b>, "
                + "which is below <b>" + thresholdPercent + "%</b> of your monthly target of "
                + "<b>" + settings.getMonthlyRevenueTarget() + "</b>.</p>";

        try {
            emailService.sendEmail(settings.getAlertEmail(), "BiOS Alert: Revenue Pace Below Target", html);
        } catch (Exception ex) {
            log.error("Failed to send BiOS revenue shortfall alert to {}", settings.getAlertEmail(), ex);
        }
    }
}
