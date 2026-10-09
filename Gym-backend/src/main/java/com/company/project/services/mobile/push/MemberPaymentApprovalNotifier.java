package com.company.project.services.mobile.push;

import com.company.project.entities.Member;
import com.company.project.entities.MobilePushToken;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.services.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;

/**
 * Tells a member staff approved (MemberService.approveMemberPayment) or rejected
 * (MemberService.rejectMemberPayment) their mobile Cash/Credit/Mixed purchase:
 * an in-app notification plus a push to every registered device. The mobile app
 * re-checks its approval gate and shows a toast when the push arrives in the
 * foreground; a rejection carries staff's reason.
 *
 * Purely informational — neither carries a route (no actionUrl / no "url" in
 * the push data), so tapping it doesn't navigate anywhere.
 *
 * Both are sent only after the decision commits, so a rolled-back approval
 * never tells the member they're in.
 */
@Service
public class MemberPaymentApprovalNotifier {

    private static final Logger log = LoggerFactory.getLogger(MemberPaymentApprovalNotifier.class);

    // Must match the mobile app's PAYMENT_APPROVED_NOTIFICATION_TYPE.
    public static final String PUSH_TYPE = "membership_payment_approved";
    // Must match the mobile app's PAYMENT_REJECTED_NOTIFICATION_TYPE.
    public static final String REJECTED_PUSH_TYPE = "membership_payment_rejected";
    // Must match the mobile app's PAYMENT_APPROVED_NOTIFICATION_MODULE — the app treats
    // this module as tap-does-nothing. Not a PermissionCatalog module, so it's never hidden.
    public static final String NOTIFICATION_MODULE = "MEMBERSHIP_APPROVAL";
    private static final String TITLE = "Payment Approved";
    private static final String REJECTED_TITLE = "Payment Rejected";

    private final NotificationService notificationService;
    private final MobilePushTokenRepository pushTokenRepository;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    public MemberPaymentApprovalNotifier(NotificationService notificationService,
                                         MobilePushTokenRepository pushTokenRepository,
                                         ExpoPushClient expoPushClient,
                                         PlatformTransactionManager transactionManager) {
        this.notificationService = notificationService;
        this.pushTokenRepository = pushTokenRepository;
        this.expoPushClient = expoPushClient;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Call from inside the approving transaction; delivery happens after it commits. */
    public void notifyApproved(Member member) {
        String plan = member.getMembershipPlan();
        String planPart = plan != null && !plan.isBlank() ? " for " + plan : "";
        notify(member, TITLE, "Your payment" + planPart + " has been approved. Your membership is now active.",
                "SUCCESS", PUSH_TYPE, "MEMBER_PAYMENT_APPROVED_");
    }

    /** Call from inside the rejecting transaction; delivery happens after it commits. */
    public void notifyRejected(Member member) {
        String plan = member.getMembershipPlan();
        String planPart = plan != null && !plan.isBlank() ? " for " + plan : "";
        String reason = member.getRejectionReason();
        String reasonPart = reason != null && !reason.isBlank() ? " Reason: " + reason.trim() : "";
        notify(member, REJECTED_TITLE, "Your payment" + planPart + " was rejected by the gym." + reasonPart,
                "WARNING", REJECTED_PUSH_TYPE, "MEMBER_PAYMENT_REJECTED_");
    }

    private void notify(Member member, String title, String message, String type,
                        String pushType, String eventKeyPrefix) {
        // Mobile members sign in with their global account, so that's the id the
        // app's notification feed is fetched with (same fallback as BookingService).
        Long targetUserId = member.getGlobalUserId() != null ? member.getGlobalUserId() : member.getUserId();
        Long memberId = member.getId();
        String eventKey = eventKeyPrefix + memberId + "_" + member.getApprovedAt();
        // Read now, while the tenant's transaction/session is still open.
        List<String> tokens = pushTokenRepository.findByMemberId(memberId).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();

        runAfterCommit(() -> {
            notificationService.notifyUser(
                    targetUserId, title, message,
                    type, "MEDIUM", NOTIFICATION_MODULE,
                    memberId, null, eventKey);
            sendPush(memberId, tokens, title, message, pushType);
        });
    }

    private void sendPush(Long memberId, List<String> tokens, String title, String message, String pushType) {
        if (tokens.isEmpty()) return;
        try {
            Map<String, Object> data = Map.of("type", pushType, "memberId", memberId);
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, message, data);
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        } catch (Exception e) {
            log.error("Payment-decision push failed for member {}: {}", memberId, e.getMessage(), e);
        }
    }

    private static void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    action.run();
                } catch (Exception e) {
                    // Never surface a notification failure on a decision that already committed.
                    log.error("Payment-decision notification failed: {}", e.getMessage(), e);
                }
            }
        });
    }
}
