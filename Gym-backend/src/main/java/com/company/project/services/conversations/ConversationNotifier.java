package com.company.project.services.conversations;

import com.company.project.entities.Conversation;
import com.company.project.entities.Member;
import com.company.project.entities.MobilePushToken;
import com.company.project.entities.Staff;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.services.NotificationService;
import com.company.project.services.mobile.push.ExpoPushClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Chat pushes, sent only once the message has committed. A member's message reaches
 * staff right away during their hours; outside them the conversation is marked and
 * ConversationQuietHoursScheduler sends one push when the shift starts. Staff messages
 * reach the member right away. Report and block alerts go to the gym's admins in-app.
 */
@Component
public class ConversationNotifier {

    private static final Logger log = LoggerFactory.getLogger(ConversationNotifier.class);

    // Must match the mobile app's conversation push handling.
    public static final String PUSH_TYPE = "conversation_message";
    public static final String NOTIFICATION_MODULE = "CONVERSATIONS";
    private static final String ADMIN_ROLE = "ADMIN";
    private static final int PUSH_PREVIEW_LENGTH = 80;

    private final StaffRepository staffRepository;
    private final StaffBranchRepository staffBranchRepository;
    private final MobilePushTokenRepository pushTokenRepository;
    private final ExpoPushClient expoPushClient;
    private final NotificationService notificationService;
    private final ConversationPolicyService policy;
    private final TransactionTemplate isolatedTx;

    public ConversationNotifier(
            StaffRepository staffRepository,
            StaffBranchRepository staffBranchRepository,
            MobilePushTokenRepository pushTokenRepository,
            ExpoPushClient expoPushClient,
            NotificationService notificationService,
            ConversationPolicyService policy,
            PlatformTransactionManager transactionManager) {
        this.staffRepository = staffRepository;
        this.staffBranchRepository = staffBranchRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.expoPushClient = expoPushClient;
        this.notificationService = notificationService;
        this.policy = policy;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** The staff who should hear about a member's message: the staff member, or the branch's reachable desk staff. */
    public List<Staff> recipients(Conversation c, Staff staff) {
        if (staff != null) return policy.isReachable(staff, c.getBranchId()) ? List.of(staff) : List.of();
        return staffRepository.findAllById(staffBranchRepository.findStaffIdsByBranchId(c.getBranchId())).stream()
                .filter(ConversationPolicyService::isDeskStaff)
                .filter(s -> policy.isReachable(s, c.getBranchId()))
                .toList();
    }

    /** A member wrote: push the on-duty recipients now, or hold it for their shift. */
    public void memberMessaged(Conversation c, Member member, Staff staff, String body, LocalDateTime now) {
        List<Staff> onDuty = recipients(c, staff).stream()
                .filter(s -> ConversationPolicyService.isOnDuty(s, now))
                .toList();
        if (onDuty.isEmpty()) {
            if (c.getStaffPushPendingSince() == null) c.setStaffPushPendingSince(now);
            return;
        }
        pushStaff(onDuty.stream().map(Staff::getId).toList(), c.getId(), member.getName(), preview(body));
    }

    /** A staff member wrote: the member hears straight away. */
    public void staffMessaged(Conversation c, Staff sender, String body) {
        String title = c.isFrontDesk() ? "Front desk" : sender.getName();
        List<String> tokens = pushTokenRepository.findByMemberId(c.getMemberId()).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();
        push(tokens, title, preview(body), c.getId());
    }

    /** Held messages whose recipients are now on shift: one push per conversation. */
    public boolean flushPending(Conversation c, Staff staff, Member member, LocalDateTime now) {
        List<Long> onDuty = recipients(c, staff).stream()
                .filter(s -> ConversationPolicyService.isOnDuty(s, now))
                .map(Staff::getId)
                .toList();
        if (onDuty.isEmpty()) return false;
        String name = member != null ? member.getName() : "A member";
        int unread = Math.max(1, c.getStaffUnread());
        pushStaff(onDuty, c.getId(), name, unread == 1 ? "Sent you a message" : "Sent you " + unread + " messages");
        return true;
    }

    public void reportFiled(Long reportId, String reporterName, String reason) {
        afterCommit(() -> notificationService.notifyRoles(List.of(ADMIN_ROLE),
                "Chat message reported",
                reporterName + " reported a chat message (" + reason.toLowerCase().replace('_', ' ') + ").",
                "WARNING", "HIGH", NOTIFICATION_MODULE, reportId,
                "/conversation-reports", "CONVERSATION_REPORT_" + reportId));
    }

    /** Admins hear that a member blocked a staff member; they don't get the conversation itself. */
    public void memberBlocked(Conversation c, Member member, Staff staff) {
        String staffName = staff != null ? staff.getName() : "the front desk";
        afterCommit(() -> notificationService.notifyRoles(List.of(ADMIN_ROLE),
                "Member blocked a chat",
                member.getName() + " blocked their chat with " + staffName + ".",
                "WARNING", "MEDIUM", NOTIFICATION_MODULE, c.getId(),
                null, "CONVERSATION_BLOCKED_" + c.getId() + "_" + LocalDateTime.now().toLocalDate()));
    }

    private void pushStaff(Collection<Long> staffIds, Long conversationId, String title, String body) {
        List<String> tokens = pushTokenRepository.findByStaffIdIn(staffIds).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();
        push(tokens, title, body, conversationId);
    }

    private void push(List<String> tokens, String title, String body, Long conversationId) {
        if (tokens.isEmpty()) return;
        afterCommit(() -> {
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, body,
                    Map.of("type", PUSH_TYPE, "conversationId", conversationId));
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        });
    }

    private static String preview(String body) {
        return body.length() <= PUSH_PREVIEW_LENGTH ? body : body.substring(0, PUSH_PREVIEW_LENGTH - 1) + "…";
    }

    private static void afterCommit(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (Exception e) {
                // Never surface a notification failure on a message that already committed.
                log.error("Conversation notification failed: {}", e.getMessage(), e);
            }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safe.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safe.run();
            }
        });
    }
}
