package com.company.project.services;

import com.company.project.dto.ratings.GymReviewRequestStatusDTO;
import com.company.project.entities.GymReviewRequest;
import com.company.project.entities.GymReviewRequestRecipient;
import com.company.project.entities.Member;
import com.company.project.entities.MobilePushToken;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymReviewRequestRecipientRepository;
import com.company.project.repositories.GymReviewRequestRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.mobile.push.ExpoPushClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

/**
 * "Request reviews": a gym asks its existing members to rate a branch. Each member it
 * reaches gets an in-app notification and a push; the app opens the rate sheet on its
 * next launch until they rate or close it (GymReviewRequestRecipient).
 *
 * Rules: at most once per branch every {@value #COOLDOWN_DAYS} days; only members with
 * an active membership, an app login, at least a day at the gym, and no review of the
 * branch yet.
 *
 * Everything runs scoped to the target branch, so an owner in "All branches" mode can
 * send it too — branch-aware rows (requests, recipients, notifications) are checked
 * against the active branch when saved.
 */
@Service
public class GymReviewRequestService {

    private static final Logger log = LoggerFactory.getLogger(GymReviewRequestService.class);

    public static final int COOLDOWN_DAYS = 30;
    private static final int MIN_MEMBER_AGE_DAYS = 1;

    // Must match the mobile app's GYM_REVIEW_REQUEST_* constants.
    public static final String NOTIFICATION_MODULE = "GYM_REVIEW_REQUEST";
    public static final String PUSH_TYPE = "gym_review_request";
    private static final String ACTION_URL = "/rate-gym";
    private static final String TITLE = "How are we doing?";

    private final GymReviewRequestRepository requestRepository;
    private final GymReviewRequestRecipientRepository recipientRepository;
    private final MemberRepository memberRepository;
    private final ReviewRepository reviewRepository;
    private final BranchRepository branchRepository;
    private final MobilePushTokenRepository pushTokenRepository;
    private final NotificationService notificationService;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate tx;

    public GymReviewRequestService(
            GymReviewRequestRepository requestRepository,
            GymReviewRequestRecipientRepository recipientRepository,
            MemberRepository memberRepository,
            ReviewRepository reviewRepository,
            BranchRepository branchRepository,
            MobilePushTokenRepository pushTokenRepository,
            NotificationService notificationService,
            ExpoPushClient expoPushClient,
            PlatformTransactionManager transactionManager) {
        this.requestRepository = requestRepository;
        this.recipientRepository = recipientRepository;
        this.memberRepository = memberRepository;
        this.reviewRepository = reviewRepository;
        this.branchRepository = branchRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.notificationService = notificationService;
        this.expoPushClient = expoPushClient;
        this.tx = new TransactionTemplate(transactionManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
    }

    public GymReviewRequestStatusDTO status(Long branchId) {
        return inBranch(branchId, () -> tx.execute(s -> buildStatus(branchId)));
    }

    /** Sends a review request to every eligible member of the branch and returns the new status. */
    public GymReviewRequestStatusDTO send(Long branchId) {
        return inBranch(branchId, () -> {
            List<Recipient> recipients = tx.execute(s -> createRequest(branchId));
            String branchName = branchRepository.findById(branchId).map(b -> b.getBranchName()).orElse("our gym");
            String message = "Tell us how your time at " + branchName + " has been — tap to rate us.";
            deliver(recipients, message);
            return tx.execute(s -> buildStatus(branchId));
        });
    }

    private List<Recipient> createRequest(Long branchId) {
        GymReviewRequestStatusDTO status = buildStatus(branchId);
        if (!status.isCanRequest()) {
            throw new BusinessRuleViolationException(
                    "Reviews were already requested on " + status.getLastRequestedAt().toLocalDate()
                            + ". You can ask again after " + status.getNextAvailableAt().toLocalDate() + ".");
        }
        List<Member> members = eligibleMembers(branchId);
        if (members.isEmpty()) {
            throw new BusinessRuleViolationException("No members to ask right now — everyone eligible has already rated this branch.");
        }

        GymReviewRequest request = new GymReviewRequest();
        request.setBranchId(branchId);
        request.setRecipientCount(members.size());
        request = requestRepository.save(request);

        List<Recipient> recipients = new ArrayList<>();
        for (Member m : members) {
            recipientRepository.save(new GymReviewRequestRecipient(request.getId(), branchId, m.getId()));
            List<String> tokens = pushTokenRepository.findByMemberId(m.getId()).stream()
                    .map(MobilePushToken::getExpoPushToken)
                    .toList();
            // Mobile members sign in with their global account (same fallback as MemberPaymentApprovalNotifier).
            Long targetUserId = m.getGlobalUserId() != null ? m.getGlobalUserId() : m.getUserId();
            recipients.add(new Recipient(request.getId(), m.getId(), targetUserId, tokens));
        }
        return recipients;
    }

    /** After the request is committed; a delivery failure never undoes it. */
    private void deliver(List<Recipient> recipients, String message) {
        List<String> tokens = new ArrayList<>();
        for (Recipient r : recipients) {
            try {
                notificationService.notifyUser(r.targetUserId(), TITLE, message,
                        "INFO", "MEDIUM", NOTIFICATION_MODULE,
                        r.requestId(), ACTION_URL, "GYM_REVIEW_REQUEST_" + r.requestId() + "_" + r.memberId());
            } catch (Exception e) {
                log.error("Review-request notification failed for member {}: {}", r.memberId(), e.getMessage());
            }
            tokens.addAll(r.tokens());
        }
        if (tokens.isEmpty()) return;
        try {
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, TITLE, message, Map.of("type", PUSH_TYPE));
            if (!result.unregisteredTokens().isEmpty()) {
                tx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        } catch (Exception e) {
            log.error("Review-request push failed: {}", e.getMessage(), e);
        }
    }

    private GymReviewRequestStatusDTO buildStatus(Long branchId) {
        GymReviewRequestStatusDTO dto = new GymReviewRequestStatusDTO();
        dto.setCooldownDays(COOLDOWN_DAYS);
        Optional<GymReviewRequest> last = requestRepository.findFirstByBranchIdOrderByCreatedAtDesc(branchId);
        LocalDateTime next = last.map(r -> r.getCreatedAt().plusDays(COOLDOWN_DAYS)).orElse(null);
        last.ifPresent(r -> {
            dto.setLastRequestedAt(r.getCreatedAt());
            dto.setLastRecipientCount(r.getRecipientCount());
        });
        boolean coolingDown = next != null && next.isAfter(LocalDateTime.now());
        dto.setNextAvailableAt(coolingDown ? next : null);
        dto.setEligibleCount(eligibleMembers(branchId).size());
        dto.setCanRequest(!coolingDown);
        return dto;
    }

    private List<Member> eligibleMembers(Long branchId) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(MIN_MEMBER_AGE_DAYS);
        Set<Long> alreadyRated = new HashSet<>(reviewRepository.findMemberIdsByBranchId(branchId));
        return memberRepository.findActiveAppMembersByBranchId(branchId).stream()
                .filter(GlobalMembershipService::isActive)
                .filter(m -> {
                    LocalDateTime since = m.getJoinDate() != null ? m.getJoinDate() : m.getCreatedAt();
                    return since != null && !since.isAfter(cutoff);
                })
                .filter(m -> !alreadyRated.contains(m.getId()))
                .toList();
    }

    private static <T> T inBranch(Long branchId, Supplier<T> work) {
        Long previous = BranchContextHolder.getActiveBranchId();
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            return work.get();
        } finally {
            BranchContextHolder.setActiveBranchId(previous);
        }
    }

    private record Recipient(Long requestId, Long memberId, Long targetUserId, List<String> tokens) {}
}
