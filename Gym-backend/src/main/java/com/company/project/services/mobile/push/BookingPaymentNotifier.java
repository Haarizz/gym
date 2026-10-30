package com.company.project.services.mobile.push;

import com.company.project.entities.Booking;
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
 * Tells a member staff approved or rejected the Cash/Credit/Mixed payment for a
 * booking (BookingPaymentService.approve / reject): an in-app notification plus a
 * push to every registered device. Both open the member's Bookings screen, where a
 * rejected booking is listed with staff's reason.
 *
 * Sent only after the decision commits, so a rolled-back approval never tells the
 * member their seat is confirmed.
 */
@Service
public class BookingPaymentNotifier {

    private static final Logger log = LoggerFactory.getLogger(BookingPaymentNotifier.class);

    // Must match the mobile app's BOOKING_PAYMENT_APPROVED/REJECTED_NOTIFICATION_TYPE.
    public static final String APPROVED_PUSH_TYPE = "booking_payment_approved";
    public static final String REJECTED_PUSH_TYPE = "booking_payment_rejected";
    // Not a PermissionCatalog module: "BOOKINGS" is one, and a member's role has no
    // BOOKINGS permission, so notifications under it never reached the member.
    public static final String NOTIFICATION_MODULE = "BOOKING_PAYMENT";
    // The mobile app maps "/bookings" to the member's Bookings screen.
    private static final String ACTION_URL = "/bookings";

    private final NotificationService notificationService;
    private final MobilePushTokenRepository pushTokenRepository;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    public BookingPaymentNotifier(NotificationService notificationService,
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
    public void notifyApproved(Booking booking) {
        notify(booking, "Booking Confirmed",
                "Your payment for " + sessionName(booking) + " was approved. Your seat is confirmed.",
                "SUCCESS", APPROVED_PUSH_TYPE, "BOOKING_PAYMENT_APPROVED_");
    }

    /** Call from inside the rejecting transaction; delivery happens after it commits. */
    public void notifyRejected(Booking booking, String reason) {
        String reasonPart = reason != null && !reason.isBlank() ? " Reason: " + reason.trim() + "." : "";
        notify(booking, "Booking Payment Rejected",
                "Your payment for " + sessionName(booking) + " was not approved, so the booking was cancelled."
                        + reasonPart + " Nothing was charged.",
                "WARNING", REJECTED_PUSH_TYPE, "BOOKING_PAYMENT_REJECTED_");
    }

    private void notify(Booking booking, String title, String message, String type,
                        String pushType, String eventKeyPrefix) {
        Member member = booking.getMember();
        if (member == null) return;
        // Mobile members sign in with their global account, so that's the id the
        // app's notification feed is fetched with (same as MemberPaymentApprovalNotifier).
        Long targetUserId = member.getGlobalUserId() != null ? member.getGlobalUserId() : member.getUserId();
        Long memberId = member.getId();
        Long bookingId = booking.getId();
        String eventKey = eventKeyPrefix + bookingId;
        // Read now, while the tenant's transaction/session is still open.
        List<String> tokens = pushTokenRepository.findByMemberId(memberId).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();

        runAfterCommit(() -> {
            notificationService.notifyUser(targetUserId, title, message, type, "MEDIUM",
                    NOTIFICATION_MODULE, bookingId, ACTION_URL, eventKey);
            sendPush(memberId, bookingId, tokens, title, message, pushType);
        });
    }

    private void sendPush(Long memberId, Long bookingId, List<String> tokens, String title, String message,
                          String pushType) {
        if (tokens.isEmpty()) return;
        try {
            Map<String, Object> data = Map.of("type", pushType, "bookingId", bookingId);
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, message, data);
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        } catch (Exception e) {
            log.error("Booking payment push failed for member {}: {}", memberId, e.getMessage(), e);
        }
    }

    private static String sessionName(Booking booking) {
        return booking.getSession() != null && booking.getSession().getName() != null
                ? booking.getSession().getName() : "your session";
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
                    log.error("Booking payment notification failed: {}", e.getMessage(), e);
                }
            }
        });
    }
}
