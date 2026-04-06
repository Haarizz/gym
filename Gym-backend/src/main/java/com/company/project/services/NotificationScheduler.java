package com.company.project.services;

import com.company.project.entities.Asset;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Member;
import com.company.project.entities.TaxCompliance;
import com.company.project.repositories.AssetRepository;
import com.company.project.repositories.FollowUpRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.NotificationRepository;
import com.company.project.repositories.TaxComplianceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Daily scheduler that fires aggregated notifications for time-sensitive events:
 * expiring memberships, overdue follow-ups, asset maintenance, and tax compliance.
 *
 * Runs at 08:00 every day. A 02:00 job soft-deletes notifications older than 30 days.
 */
@Component
public class NotificationScheduler {

    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;
    private final FollowUpRepository followUpRepository;
    private final AssetRepository assetRepository;
    private final TaxComplianceRepository taxComplianceRepository;

    public NotificationScheduler(NotificationService notificationService,
                                  NotificationRepository notificationRepository,
                                  MemberRepository memberRepository,
                                  FollowUpRepository followUpRepository,
                                  AssetRepository assetRepository,
                                  TaxComplianceRepository taxComplianceRepository) {
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
        this.memberRepository = memberRepository;
        this.followUpRepository = followUpRepository;
        this.assetRepository = assetRepository;
        this.taxComplianceRepository = taxComplianceRepository;
    }

    /** Daily checks at 08:00. */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void runDailyChecks() {
        checkMembershipsExpiringSoon();
        checkMembershipsExpired();
        checkFollowUpsDueToday();
        checkFollowUpsOverdue();
        checkAssetMaintenanceDue();
        checkTaxComplianceDue();
    }

    /** Cleanup: soft-delete notifications older than 30 days (runs at 02:00). */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        notificationRepository.softDeleteOlderThan(LocalDateTime.now().minusDays(30));
    }

    // ── Individual checks ─────────────────────────────────────────────────────

    private void checkMembershipsExpiringSoon() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime window = now.plusDays(7);
        String today = LocalDate.now().toString();

        List<Member> expiring = memberRepository.findAll().stream()
                .filter(m -> m.getExpiryDate() != null
                        && m.getExpiryDate().isAfter(now)
                        && m.getExpiryDate().isBefore(window)
                        && !"expired".equalsIgnoreCase(m.getMembershipStatus()))
                .collect(Collectors.toList());

        if (expiring.isEmpty()) return;
        int count = expiring.size();

        notificationService.notifyRoleAggregated(
                "ADMIN",
                count + " Membership" + (count > 1 ? "s" : "") + " Expiring Soon",
                count + " membership" + (count > 1 ? "s expire" : " expires") + " within 7 days.",
                "WARNING", "MEDIUM", "MEMBERS",
                "/members",
                "MEMBERS_EXPIRING_ADMIN_" + today, count
        );
        notificationService.notifyRoleAggregated(
                "MANAGER",
                count + " Membership" + (count > 1 ? "s" : "") + " Expiring Soon",
                count + " membership" + (count > 1 ? "s expire" : " expires") + " within 7 days.",
                "WARNING", "MEDIUM", "MEMBERS",
                "/members",
                "MEMBERS_EXPIRING_MANAGER_" + today, count
        );

        // Individual notification for each member's own account
        for (Member m : expiring) {
            if (m.getUserId() != null) {
                String daysLeft = m.getExpiryDate() != null
                        ? String.valueOf(java.time.temporal.ChronoUnit.DAYS.between(now.toLocalDate(), m.getExpiryDate().toLocalDate()))
                        : "?";
                notificationService.notifyUser(
                        m.getUserId(),
                        "Membership Expiring Soon",
                        "Your membership expires in " + daysLeft + " day" + (daysLeft.equals("1") ? "" : "s") + ". Renew now to stay active.",
                        "WARNING", "MEDIUM", "MEMBERS",
                        m.getId(), "/membership-renewal",
                        "MEMBER_EXPIRING_USER_" + m.getId() + "_" + today
                );
            }
        }
    }

    private void checkMembershipsExpired() {
        LocalDateTime now = LocalDateTime.now();
        String today = LocalDate.now().toString();

        List<Member> expired = memberRepository.findAll().stream()
                .filter(m -> m.getExpiryDate() != null
                        && m.getExpiryDate().isBefore(now)
                        && !"expired".equalsIgnoreCase(m.getMembershipStatus()))
                .collect(Collectors.toList());

        if (expired.isEmpty()) return;
        int count = expired.size();

        notificationService.notifyRoleAggregated(
                "ADMIN",
                count + " Membership" + (count > 1 ? "s" : "") + " Expired",
                count + " membership" + (count > 1 ? "s have" : " has") + " expired today.",
                "DANGER", "HIGH", "MEMBERS",
                "/members",
                "MEMBERS_EXPIRED_ADMIN_" + today, count
        );
        notificationService.notifyRoleAggregated(
                "MANAGER",
                count + " Membership" + (count > 1 ? "s" : "") + " Expired",
                count + " membership" + (count > 1 ? "s have" : " has") + " expired today.",
                "DANGER", "HIGH", "MEMBERS",
                "/members",
                "MEMBERS_EXPIRED_MANAGER_" + today, count
        );

        for (Member m : expired) {
            if (m.getUserId() != null) {
                notificationService.notifyUser(
                        m.getUserId(),
                        "Membership Expired",
                        "Your membership has expired. Please renew to continue accessing the gym.",
                        "DANGER", "HIGH", "MEMBERS",
                        m.getId(), "/membership-renewal",
                        "MEMBER_EXPIRED_USER_" + m.getId() + "_" + today
                );
            }
        }
    }

    private void checkFollowUpsDueToday() {
        LocalDate today = LocalDate.now();
        String todayStr = today.toString();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        List<FollowUp> dueToday = followUpRepository.findAll().stream()
                .filter(f -> f.getDueDate() != null
                        && !f.getDueDate().isBefore(startOfDay)
                        && !f.getDueDate().isAfter(endOfDay)
                        && "pending".equalsIgnoreCase(f.getStatus()))
                .collect(Collectors.toList());

        if (dueToday.isEmpty()) return;
        int count = dueToday.size();

        notificationService.notifyRoleAggregated(
                "ADMIN",
                count + " Follow-Up" + (count > 1 ? "s" : "") + " Due Today",
                count + " follow-up" + (count > 1 ? "s are" : " is") + " due today.",
                "WARNING", "MEDIUM", "FOLLOW_UPS",
                "/follow-ups",
                "FOLLOWUPS_DUE_ADMIN_" + todayStr, count
        );
        notificationService.notifyRoleAggregated(
                "MANAGER",
                count + " Follow-Up" + (count > 1 ? "s" : "") + " Due Today",
                count + " follow-up" + (count > 1 ? "s are" : " is") + " due today.",
                "WARNING", "MEDIUM", "FOLLOW_UPS",
                "/follow-ups",
                "FOLLOWUPS_DUE_MANAGER_" + todayStr, count
        );
    }

    private void checkFollowUpsOverdue() {
        String todayStr = LocalDate.now().toString();

        List<FollowUp> overdue = followUpRepository.findByStatusAndDueDateBefore(
                "pending", LocalDateTime.now().minusDays(1));

        if (overdue.isEmpty()) return;
        int count = overdue.size();

        notificationService.notifyRoleAggregated(
                "ADMIN",
                count + " Overdue Follow-Up" + (count > 1 ? "s" : ""),
                count + " follow-up" + (count > 1 ? "s are" : " is") + " overdue and need attention.",
                "DANGER", "HIGH", "FOLLOW_UPS",
                "/follow-ups",
                "FOLLOWUPS_OVERDUE_ADMIN_" + todayStr, count
        );
        notificationService.notifyRoleAggregated(
                "MANAGER",
                count + " Overdue Follow-Up" + (count > 1 ? "s" : ""),
                count + " follow-up" + (count > 1 ? "s are" : " is") + " overdue.",
                "DANGER", "HIGH", "FOLLOW_UPS",
                "/follow-ups",
                "FOLLOWUPS_OVERDUE_MANAGER_" + todayStr, count
        );
    }

    private void checkAssetMaintenanceDue() {
        LocalDate today = LocalDate.now();
        LocalDate window = today.plusDays(7);
        String todayStr = today.toString();

        List<Asset> due = assetRepository.findAll().stream()
                .filter(a -> a.getNextMaintenanceDate() != null
                        && !a.getNextMaintenanceDate().isBefore(today)
                        && !a.getNextMaintenanceDate().isAfter(window))
                .collect(Collectors.toList());

        if (due.isEmpty()) return;
        int count = due.size();

        notificationService.notifyRoleAggregated(
                "ADMIN",
                count + " Asset" + (count > 1 ? "s" : "") + " Due for Maintenance",
                count + " asset" + (count > 1 ? "s require" : " requires") + " maintenance within 7 days.",
                "WARNING", "MEDIUM", "ASSETS",
                "/manage-assets",
                "ASSET_MAINTENANCE_ADMIN_" + todayStr, count
        );
        notificationService.notifyRoleAggregated(
                "MANAGER",
                count + " Asset" + (count > 1 ? "s" : "") + " Due for Maintenance",
                count + " asset" + (count > 1 ? "s require" : " requires") + " maintenance within 7 days.",
                "WARNING", "MEDIUM", "ASSETS",
                "/manage-assets",
                "ASSET_MAINTENANCE_MANAGER_" + todayStr, count
        );
    }

    private void checkTaxComplianceDue() {
        LocalDate today = LocalDate.now();
        LocalDate window = today.plusDays(7);
        String todayStr = today.toString();

        List<TaxCompliance> due = taxComplianceRepository.findAll().stream()
                .filter(t -> t.getDueDate() != null
                        && !t.getDueDate().isBefore(today)
                        && !t.getDueDate().isAfter(window)
                        && !"FILED".equalsIgnoreCase(t.getStatus()))
                .collect(Collectors.toList());

        if (due.isEmpty()) return;
        int count = due.size();
        String names = due.stream()
                .map(t -> t.getTaxType() != null ? t.getTaxType() : "Tax")
                .limit(3)
                .collect(Collectors.joining(", "));
        if (due.size() > 3) names += " and " + (due.size() - 3) + " more";

        notificationService.notifyRoles(
                List.of("ADMIN", "ACCOUNTANT"),
                "Tax Compliance Due Soon",
                count + " compliance item" + (count > 1 ? "s" : "") + " due within 7 days: " + names + ".",
                "DANGER", "CRITICAL", "FINANCIALS",
                null, "/tax-compliance",
                "TAX_DUE_" + todayStr
        );
    }
}
