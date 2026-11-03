package com.company.project.services.mobile.push;

import com.company.project.entities.Member;
import com.company.project.entities.MobilePushToken;
import com.company.project.entities.TrainingSession;
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

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Messages to members about a training session they booked: a staff reminder
 * (Trainings & Classes › Send Reminder) and "a spot opened up" when they move off the
 * waitlist. In-app notification (module BOOKINGS, opens /book-session like the other
 * booking notifications) plus a push to every registered device, sent after commit.
 */
@Service
public class SessionMemberNotifier {

    private static final Logger log = LoggerFactory.getLogger(SessionMemberNotifier.class);

    public static final String REMINDER_PUSH_TYPE = "session_reminder";
    public static final String PROMOTED_PUSH_TYPE = "session_waitlist_promoted";
    private static final String MODULE = "BOOKINGS";
    private static final String ACTION_URL = "/book-session";
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("EEE d MMM 'at' HH:mm");

    private final NotificationService notificationService;
    private final MobilePushTokenRepository pushTokenRepository;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    public SessionMemberNotifier(NotificationService notificationService,
                                 MobilePushTokenRepository pushTokenRepository,
                                 ExpoPushClient expoPushClient,
                                 PlatformTransactionManager transactionManager) {
        this.notificationService = notificationService;
        this.pushTokenRepository = pushTokenRepository;
        this.expoPushClient = expoPushClient;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** "Name on Tue 4 Nov at 09:00" (or just the name when the time isn't set). */
    public static String describe(TrainingSession session) {
        String name = session.getName() != null ? session.getName() : "your session";
        if (session.getDate() == null || session.getStartTime() == null) return name;
        return name + " on " + session.getDate().atTime(session.getStartTime()).format(WHEN);
    }

    /** Staff reminder. eventKey makes a double click send once. */
    public void notifyReminder(Member member, TrainingSession session, Long bookingId, String note, String eventKey) {
        String message = "Reminder: " + describe(session) + "."
                + (note != null && !note.isBlank() ? " " + note.trim() : "");
        notify(member, "Session Reminder", message, "INFO", REMINDER_PUSH_TYPE, bookingId, eventKey);
    }

    /** A seat opened up and the member moved off the waitlist. */
    public void notifyPromoted(Member member, TrainingSession session, Long bookingId) {
        notify(member, "You're In!", "A spot opened up — your booking for " + describe(session) + " is confirmed.",
                "SUCCESS", PROMOTED_PUSH_TYPE, bookingId, "BOOKING_WAITLIST_PROMOTED_" + bookingId);
    }

    private void notify(Member member, String title, String message, String type,
                        String pushType, Long bookingId, String eventKey) {
        if (member == null) return;
        // Mobile members sign in with their global account (same fallback as MemberPaymentApprovalNotifier).
        Long targetUserId = member.getGlobalUserId() != null ? member.getGlobalUserId() : member.getUserId();
        Long memberId = member.getId();
        // Read now, while the tenant's transaction/session is still open.
        List<String> tokens = pushTokenRepository.findByMemberId(memberId).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();

        runAfterCommit(() -> {
            if (targetUserId != null) {
                notificationService.notifyUser(targetUserId, title, message, type, "MEDIUM", MODULE,
                        bookingId, ACTION_URL, eventKey);
            }
            sendPush(memberId, tokens, title, message, pushType, bookingId);
        });
    }

    private void sendPush(Long memberId, List<String> tokens, String title, String message, String pushType, Long bookingId) {
        if (tokens.isEmpty()) return;
        try {
            Map<String, Object> data = Map.of("type", pushType, "memberId", memberId, "bookingId", bookingId);
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, message, data);
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        } catch (Exception e) {
            log.error("Session push failed for member {}: {}", memberId, e.getMessage(), e);
        }
    }

    private static void runAfterCommit(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (Exception e) {
                // Never surface a notification failure on a change that already committed.
                log.error("Session notification failed: {}", e.getMessage(), e);
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
