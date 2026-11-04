package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Asset;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Member;
import com.company.project.entities.TaxCompliance;
import com.company.project.entities.TrainingSession;
import com.company.project.repositories.AssetRepository;
import com.company.project.repositories.FollowUpRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.TaxComplianceRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Daily scheduler that fires aggregated notifications for time-sensitive events:
 * expiring/expired memberships, today's classes, follow-ups, asset maintenance and
 * tax compliance.
 *
 * Runs at 08:00 every day for the primary database and every active gym's database
 * (each gym has its own DB — without switching TenantContextHolder nothing reached them,
 * DMT_04). The alerts are also refreshed once on startup, so a deploy or restart after
 * 08:00 doesn't leave the bell empty until the next morning. A 02:00 job soft-deletes
 * notifications older than 30 days.
 */
@Component
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);

    /** The gym owner/admin is ADMIN; GYMBIOS_ADMIN is the platform account. */
    private static final List<String> MANAGEMENT_ROLES = List.of("ADMIN", "GYMBIOS_ADMIN", "MANAGER");
    /** Front desk too — renewals and classes are handled at reception (module permissions still apply). */
    private static final List<String> DESK_ROLES = List.of("ADMIN", "GYMBIOS_ADMIN", "MANAGER", "RECEPTIONIST");
    private static final int EXPIRY_WINDOW_DAYS = 7;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a");

    private final NotificationService notificationService;
    private final MemberRepository memberRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final FollowUpRepository followUpRepository;
    private final AssetRepository assetRepository;
    private final TaxComplianceRepository taxComplianceRepository;
    private final AutomationExecutorService automationExecutorService;
    private final FollowUpService followUpService;
    private final PromotionCampaignService promotionCampaignService;
    private final ReferralService referralService;
    private final ReferralCampaignService referralCampaignService;
    private final RewardRedemptionService rewardRedemptionService;
    private final TenantRepository tenantRepository;

    public NotificationScheduler(NotificationService notificationService,
                                  MemberRepository memberRepository,
                                  TrainingSessionRepository trainingSessionRepository,
                                  FollowUpRepository followUpRepository,
                                  AssetRepository assetRepository,
                                  TaxComplianceRepository taxComplianceRepository,
                                  AutomationExecutorService automationExecutorService,
                                  FollowUpService followUpService,
                                  PromotionCampaignService promotionCampaignService,
                                  ReferralService referralService,
                                  ReferralCampaignService referralCampaignService,
                                  RewardRedemptionService rewardRedemptionService,
                                  TenantRepository tenantRepository) {
        this.notificationService = notificationService;
        this.memberRepository = memberRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.followUpRepository = followUpRepository;
        this.assetRepository = assetRepository;
        this.taxComplianceRepository = taxComplianceRepository;
        this.automationExecutorService = automationExecutorService;
        this.followUpService = followUpService;
        this.promotionCampaignService = promotionCampaignService;
        this.referralService = referralService;
        this.referralCampaignService = referralCampaignService;
        this.rewardRedemptionService = rewardRedemptionService;
        this.tenantRepository = tenantRepository;
    }

    /** Daily checks at 08:00. */
    @Scheduled(cron = "0 0 8 * * *")
    public void runDailyChecks() {
        forEachDatabase(label -> {
            // Apply real status transitions first so the notification counts below
            // reflect up-to-date state rather than stale statuses nothing else flips.
            step(label, "follow-up overdue marking", followUpService::markOverdueFollowUps);
            step(label, "promotion statuses", promotionCampaignService::autoTransitionStatuses);
            step(label, "referral expiry", referralService::expirePendingReferralsPastDeadline);
            step(label, "referral campaign statuses", referralCampaignService::autoTransitionStatuses);
            step(label, "reward expiry", rewardRedemptionService::expireStaleRewards);

            runAlertChecks(label);
            step(label, "rewards expiring soon", rewardRedemptionService::notifyRewardsExpiringSoon);
            step(label, "scheduled automations", automationExecutorService::runScheduledWorkflows);
            return null;
        });
    }

    /**
     * Today's alerts only (idempotent: per-day event keys, counts set not added) — status
     * transitions and automations stay on the 08:00 run. Off the startup thread.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void refreshAlertsOnStartup() {
        Thread t = new Thread(() -> forEachDatabase(label -> {
            runAlertChecks(label);
            return null;
        }), "notification-alerts-catchup");
        t.setDaemon(true);
        t.start();
    }

    /** Cleanup: soft-delete notifications older than 30 days (runs at 02:00). */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        forEachDatabase(label -> {
            step(label, "notification cleanup",
                    () -> notificationService.softDeleteOlderThan(LocalDateTime.now().minusDays(30)));
            return null;
        });
    }

    // ── Per-database plumbing ─────────────────────────────────────────────────

    /** Runs the work against the primary database, then each active gym's database. */
    private void forEachDatabase(Function<String, Void> work) {
        work.apply("primary");
        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Notification checks: could not list tenants", e);
            return;
        }
        for (Tenant tenant : tenants) {
            if (tenant.getSlug() == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                work.apply(tenant.getSlug());
            } catch (Exception e) {
                log.error("Notification checks failed for {}", tenant.getSlug(), e);
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    /** One check failing (e.g. a table a gym's DB lacks) mustn't stop the others. */
    private static void step(String label, String what, Runnable r) {
        try {
            r.run();
        } catch (Exception e) {
            log.error("Notification checks: {} failed for {}", what, label, e);
        }
    }

    private void runAlertChecks(String label) {
        step(label, "memberships expiring soon", this::checkMembershipsExpiringSoon);
        step(label, "memberships expired", this::checkMembershipsExpired);
        step(label, "classes today", this::checkClassesToday);
        step(label, "follow-ups due today", this::checkFollowUpsDueToday);
        step(label, "follow-ups overdue", this::checkFollowUpsOverdue);
        step(label, "asset maintenance", this::checkAssetMaintenanceDue);
        step(label, "tax compliance", this::checkTaxComplianceDue);
    }

    private void summary(List<String> roles, String title, String message, String type, String priority,
                         String module, String actionUrl, String keyPrefix, int count) {
        String today = LocalDate.now().toString();
        for (String role : roles) {
            notificationService.upsertRoleSummary(role, title, message, type, priority, module, actionUrl,
                    keyPrefix + "_" + role + "_" + today, count);
        }
    }

    /** "Ali (GYM00012), Sara (GYM00020), Omar (GYM00031) and 4 more" */
    private static String names(List<Member> members) {
        String shown = members.stream().limit(3)
                .map(m -> m.getMemberId() != null ? m.getName() + " (" + m.getMemberId() + ")" : m.getName())
                .collect(Collectors.joining(", "));
        return members.size() > 3 ? shown + " and " + (members.size() - 3) + " more" : shown;
    }

    private static LocalDate endDate(Member m) {
        LocalDateTime end = m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
        return end != null ? end.toLocalDate() : null;
    }

    // ── Individual checks ─────────────────────────────────────────────────────

    /**
     * Memberships whose last day is today or within the next 7 days, by the effective end date
     * (membership_status is never flipped to "expired", so the stored status can't be used).
     */
    private void checkMembershipsExpiringSoon() {
        LocalDate today = LocalDate.now();
        List<Member> expiring = memberRepository.findMembershipsEndingBetween(
                today.atStartOfDay(), today.plusDays(EXPIRY_WINDOW_DAYS + 1L).atStartOfDay()).stream()
                .filter(m -> !"expired".equalsIgnoreCase(m.getMembershipStatus()))
                .toList();
        if (expiring.isEmpty()) return;
        int count = expiring.size();
        long endingToday = expiring.stream().filter(m -> today.equals(endDate(m))).count();

        summary(DESK_ROLES,
                count + " Membership" + (count > 1 ? "s" : "") + " Expiring Soon",
                count + " membership" + (count > 1 ? "s end" : " ends") + " within " + EXPIRY_WINDOW_DAYS + " days"
                        + (endingToday > 0 ? " (" + endingToday + " today)" : "") + ": " + names(expiring) + ".",
                "WARNING", "MEDIUM", "MEMBERS", "/members", "MEMBERS_EXPIRING", count);

        // The member's own reminder — once per membership period, not every day.
        for (Member m : expiring) {
            Long targetId = m.getUserId() != null ? m.getUserId() : m.getGlobalUserId();
            LocalDate end = endDate(m);
            if (targetId == null || end == null) continue;
            long daysLeft = ChronoUnit.DAYS.between(today, end);
            notificationService.notifyUser(
                    targetId,
                    "Membership Expiring Soon",
                    daysLeft == 0 ? "Your membership ends today. Renew now to stay active."
                            : "Your membership expires in " + daysLeft + " day" + (daysLeft == 1 ? "" : "s") + ". Renew now to stay active.",
                    "WARNING", "MEDIUM", "MEMBERS",
                    m.getId(), "/membership-renewal",
                    "MEMBER_EXPIRING_USER_" + m.getId() + "_" + end
            );
        }
    }

    /**
     * Memberships that ended in the last 7 days. Older ones are left out: the stored status
     * never flips, so "every member past their end date" would re-alert the same people daily.
     */
    private void checkMembershipsExpired() {
        LocalDate today = LocalDate.now();
        List<Member> expired = memberRepository.findMembershipsEndingBetween(
                today.minusDays(EXPIRY_WINDOW_DAYS).atStartOfDay(), today.atStartOfDay());
        if (expired.isEmpty()) return;
        int count = expired.size();

        summary(DESK_ROLES,
                count + " Membership" + (count > 1 ? "s" : "") + " Expired",
                count + " membership" + (count > 1 ? "s" : "") + " expired in the last " + EXPIRY_WINDOW_DAYS
                        + " days and " + (count > 1 ? "have" : "has") + " not been renewed: " + names(expired) + ".",
                "DANGER", "HIGH", "MEMBERS", "/members", "MEMBERS_EXPIRED", count);

        for (Member m : expired) {
            Long targetId = m.getUserId() != null ? m.getUserId() : m.getGlobalUserId();
            LocalDate end = endDate(m);
            if (targetId == null || end == null) continue;
            notificationService.notifyUser(
                    targetId,
                    "Membership Expired",
                    "Your membership has expired. Please renew to continue accessing the gym.",
                    "DANGER", "HIGH", "MEMBERS",
                    m.getId(), "/membership-renewal",
                    "MEMBER_EXPIRED_USER_" + m.getId() + "_" + end
            );
        }
    }

    /** Today's scheduled classes/sessions (cancelled ones left out). */
    private void checkClassesToday() {
        Set<String> skip = Set.of("cancelled", "completed");
        List<TrainingSession> today = trainingSessionRepository.findByDateOrderByStartTimeAsc(LocalDate.now()).stream()
                .filter(s -> s.getStatus() == null || !skip.contains(s.getStatus().toLowerCase()))
                .toList();
        if (today.isEmpty()) return;
        int count = today.size();
        String list = today.stream().limit(3)
                .map(s -> (s.getName() != null ? s.getName() : "Class")
                        + (s.getStartTime() != null ? " at " + s.getStartTime().format(TIME) : ""))
                .collect(Collectors.joining(", "));
        if (count > 3) list += " and " + (count - 3) + " more";

        summary(DESK_ROLES,
                count + " Class" + (count > 1 ? "es" : "") + " Today",
                count + " class" + (count > 1 ? "es are" : " is") + " scheduled today: " + list + ".",
                "INFO", "MEDIUM", "TRAININGS_CLASSES", "/trainings-classes", "CLASSES_TODAY", count);
    }

    private void checkFollowUpsDueToday() {
        LocalDate today = LocalDate.now();
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

        summary(MANAGEMENT_ROLES,
                count + " Follow-Up" + (count > 1 ? "s" : "") + " Due Today",
                count + " follow-up" + (count > 1 ? "s are" : " is") + " due today.",
                "WARNING", "MEDIUM", "FOLLOW_UPS", "/follow-ups", "FOLLOWUPS_DUE", count);
    }

    private void checkFollowUpsOverdue() {
        List<FollowUp> overdue = followUpRepository.findByStatusAndDueDateBefore(
                "pending", LocalDateTime.now().minusDays(1));

        if (overdue.isEmpty()) return;
        int count = overdue.size();

        summary(MANAGEMENT_ROLES,
                count + " Overdue Follow-Up" + (count > 1 ? "s" : ""),
                count + " follow-up" + (count > 1 ? "s are" : " is") + " overdue and need attention.",
                "DANGER", "HIGH", "FOLLOW_UPS", "/follow-ups", "FOLLOWUPS_OVERDUE", count);
    }

    private void checkAssetMaintenanceDue() {
        LocalDate today = LocalDate.now();
        LocalDate window = today.plusDays(7);

        List<Asset> due = assetRepository.findAll().stream()
                .filter(a -> a.getNextMaintenanceDate() != null
                        && !a.getNextMaintenanceDate().isBefore(today)
                        && !a.getNextMaintenanceDate().isAfter(window))
                .collect(Collectors.toList());

        if (due.isEmpty()) return;
        int count = due.size();

        summary(MANAGEMENT_ROLES,
                count + " Asset" + (count > 1 ? "s" : "") + " Due for Maintenance",
                count + " asset" + (count > 1 ? "s require" : " requires") + " maintenance within 7 days.",
                "WARNING", "MEDIUM", "ASSETS", "/manage-assets", "ASSET_MAINTENANCE", count);
    }

    private void checkTaxComplianceDue() {
        LocalDate today = LocalDate.now();
        LocalDate window = today.plusDays(7);

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

        summary(List.of("ADMIN", "GYMBIOS_ADMIN", "ACCOUNTANT"),
                "Tax Compliance Due Soon",
                count + " compliance item" + (count > 1 ? "s" : "") + " due within 7 days: " + names + ".",
                "DANGER", "CRITICAL", "FINANCIALS", "/tax-compliance", "TAX_DUE", count);
    }
}
