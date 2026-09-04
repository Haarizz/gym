package com.company.project.services;

import com.company.project.entities.Coupon;
import com.company.project.entities.Member;
import com.company.project.entities.ReferralReward;
import com.company.project.entities.RewardAuditLog;
import com.company.project.entities.WalletTransaction;
import com.company.project.enums.RedemptionAction;
import com.company.project.enums.RewardAuditAction;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReferralRewardRepository;
import com.company.project.repositories.RewardAuditLogRepository;
import com.company.project.repositories.WalletTransactionRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Owns the entire reward lifecycle after generation: claim, redeem (dispatched
 * by RewardType), approve, reject, cancel. Never called from a controller
 * without going through here — this is where wallet/membership/coupon/cash
 * integrations live, each writing its own RewardAuditLog entry.
 */
@Service
@Transactional
public class RewardRedemptionService {

    private static final List<RewardStatus> OPEN_STATUSES = List.of(RewardStatus.PENDING, RewardStatus.AVAILABLE);

    private final ReferralRewardRepository rewardRepository;
    private final RewardAuditLogRepository auditLogRepository;
    private final MemberRepository memberRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CouponService couponService;
    private final FinancialEventService financialEventService;
    private final NotificationService notificationService;

    public RewardRedemptionService(ReferralRewardRepository rewardRepository,
                                    RewardAuditLogRepository auditLogRepository,
                                    MemberRepository memberRepository,
                                    WalletTransactionRepository walletTransactionRepository,
                                    CouponService couponService,
                                    FinancialEventService financialEventService,
                                    NotificationService notificationService) {
        this.rewardRepository = rewardRepository;
        this.auditLogRepository = auditLogRepository;
        this.memberRepository = memberRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.couponService = couponService;
        this.financialEventService = financialEventService;
        this.notificationService = notificationService;
    }

    /** Called by RewardEngineService right after a non-approval-required reward is generated. */
    public void autoProcessOnGeneration(ReferralReward reward) {
        if (reward.getRewardType() == RewardType.COUPON) {
            couponService.generateForReward(reward);
            auditLogRepository.save(new RewardAuditLog(reward.getId(), RewardAuditAction.COUPON_GENERATED,
                    "SYSTEM", "Coupon generated for reward " + reward.getRewardCode()));
        } else if (reward.getRewardType() == RewardType.WALLET_CREDIT
                && reward.getRedemptionAction() == RedemptionAction.AUTO_WALLET) {
            creditWallet(reward);
            reward.setStatus(RewardStatus.REDEEMED);
            reward.setRedeemedDate(LocalDateTime.now());
            rewardRepository.save(reward);
            auditLogRepository.save(new RewardAuditLog(reward.getId(), RewardAuditAction.REDEEMED,
                    "SYSTEM", "Auto-credited to wallet on generation"));
        }
    }

    public ReferralReward claim(Long rewardId) {
        ReferralReward reward = findOrThrow(rewardId);
        if (reward.getStatus() == RewardStatus.PENDING) {
            throw new BusinessRuleViolationException("Reward is awaiting approval and cannot be claimed yet");
        }
        if (reward.getStatus() != RewardStatus.AVAILABLE) {
            throw new BusinessRuleViolationException("Only an available reward can be claimed");
        }
        reward.setStatus(RewardStatus.CLAIMED);
        reward.setClaimedDate(LocalDateTime.now());
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.CLAIMED, "Reward claimed");
        return saved;
    }

    public ReferralReward redeem(Long rewardId) {
        ReferralReward reward = findOrThrow(rewardId);
        if (reward.getStatus() != RewardStatus.AVAILABLE && reward.getStatus() != RewardStatus.CLAIMED) {
            throw new BusinessRuleViolationException("Reward cannot be redeemed from status " + reward.getStatus());
        }

        switch (reward.getRewardType()) {
            case WALLET_CREDIT -> {
                creditWallet(reward);
                audit(reward, RewardAuditAction.WALLET_CREDITED, "Wallet credited on redemption");
            }
            case CASH -> {
                financialEventService.onReferralRewardPaidOut(reward);
                audit(reward, RewardAuditAction.CASH_PAID, "Cash payout recorded");
            }
            case MEMBERSHIP_EXTENSION -> {
                extendMembership(reward);
                audit(reward, RewardAuditAction.MEMBERSHIP_EXTENDED, reward.getRemarks());
            }
            case COUPON -> {
                Coupon coupon = couponService.generateForReward(reward);
                couponService.consume(coupon.getCode());
                // consume() already flips the reward to REDEEMED — reload before continuing
                reward = findOrThrow(rewardId);
                audit(reward, RewardAuditAction.REDEEMED, "Coupon " + coupon.getCode() + " consumed");
                notifyRedeemed(reward);
                return reward;
            }
            case MEMBERSHIP_DISCOUNT, FREE_PT, FREE_CLASS, GIFT, LOYALTY_POINTS -> {
                // Discount is applied directly on the receipt by the caller before this
                // is invoked; PT/Class credit and gift collection are staff-confirmed
                // actions; loyalty points are marked used once applied — none of these
                // need a further integration step beyond the status transition itself.
            }
        }

        reward.setStatus(RewardStatus.REDEEMED);
        reward.setRedeemedDate(LocalDateTime.now());
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.REDEEMED, "Reward redeemed");
        notifyRedeemed(saved);
        return saved;
    }

    public ReferralReward approve(Long rewardId, String remarks) {
        ReferralReward reward = findOrThrow(rewardId);
        if (reward.getStatus() != RewardStatus.PENDING) {
            throw new BusinessRuleViolationException("Only a pending reward can be approved");
        }
        reward.setStatus(RewardStatus.AVAILABLE);
        reward.setApprovedBy(currentUser());
        reward.setApprovedDate(LocalDateTime.now());
        if (remarks != null) reward.setRemarks(remarks);
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.APPROVED, remarks);

        autoProcessOnGeneration(saved); // run deferred auto-actions now that it's approved
        return rewardRepository.findById(saved.getId()).orElse(saved);
    }

    public ReferralReward reject(Long rewardId, String remarks) {
        ReferralReward reward = findOrThrow(rewardId);
        if (reward.getStatus() != RewardStatus.PENDING) {
            throw new BusinessRuleViolationException("Only a pending reward can be rejected");
        }
        reward.setStatus(RewardStatus.CANCELLED);
        if (remarks != null) reward.setRemarks(remarks);
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.REJECTED, remarks);
        return saved;
    }

    public ReferralReward cancel(Long rewardId, String remarks) {
        ReferralReward reward = findOrThrow(rewardId);
        if (reward.getStatus() == RewardStatus.REDEEMED) {
            throw new BusinessRuleViolationException("Cannot cancel a reward that has already been redeemed");
        }
        if (reward.getStatus() == RewardStatus.CANCELLED || reward.getStatus() == RewardStatus.EXPIRED) {
            throw new BusinessRuleViolationException("Reward is already " + reward.getStatus().name().toLowerCase());
        }
        reward.setStatus(RewardStatus.CANCELLED);
        if (remarks != null) reward.setRemarks(remarks);
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.CANCELLED, remarks);
        return saved;
    }

    // ── Scheduled maintenance (called by NotificationScheduler) ───────────────

    /** Still-open rewards whose expiry date has passed get auto-expired, mirroring
     *  ReferralService.expirePendingReferralsPastDeadline()'s style. */
    public void expireStaleRewards() {
        List<ReferralReward> toExpire = rewardRepository.findByStatusInAndExpiryDateBefore(
                OPEN_STATUSES, java.time.LocalDate.now());
        for (ReferralReward reward : toExpire) {
            reward.setStatus(RewardStatus.EXPIRED);
            rewardRepository.save(reward);
            audit(reward, RewardAuditAction.EXPIRED, "Expired — past expiry date");
        }
    }

    /** Notifies staff/members about rewards expiring within the next 3 days. */
    public void notifyRewardsExpiringSoon() {
        java.time.LocalDate today = java.time.LocalDate.now();
        List<ReferralReward> expiringSoon = rewardRepository.findByStatusInAndExpiryDateBetween(
                OPEN_STATUSES, today, today.plusDays(3));

        for (ReferralReward reward : expiringSoon) {
            memberRepository.findByMemberId(reward.getMemberId()).ifPresent(member -> {
                if (member.getUserId() != null) {
                    notificationService.notifyUser(member.getUserId(), "Reward Expiring Soon",
                            reward.getRewardName() + " expires on " + reward.getExpiryDate() + ".",
                            "WARNING", "MEDIUM", "REFERRALS", reward.getId(), "/my-rewards",
                            "REWARD_EXPIRING_USER_" + reward.getId() + "_" + today);
                }
            });
        }

        if (!expiringSoon.isEmpty()) {
            int count = expiringSoon.size();
            notificationService.notifyRoles(List.of("GYMBIOS_ADMIN", "MANAGER"),
                    count + " Reward" + (count > 1 ? "s" : "") + " Expiring Soon",
                    count + " reward" + (count > 1 ? "s expire" : " expires") + " within 3 days.",
                    "WARNING", "MEDIUM", "REFERRALS", null, "/reward-queue",
                    "REWARDS_EXPIRING_" + today);
        }
    }

    // ── Type-specific integrations ────────────────────────────────────────────

    private void creditWallet(ReferralReward reward) {
        Member member = memberRepository.findByMemberId(reward.getMemberId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + reward.getMemberId()));

        BigDecimal amount = reward.getRewardValue() != null ? reward.getRewardValue() : BigDecimal.ZERO;
        BigDecimal newBalance = (member.getWalletBalance() != null ? member.getWalletBalance() : BigDecimal.ZERO).add(amount);
        member.setWalletBalance(newBalance);
        memberRepository.save(member);

        WalletTransaction tx = new WalletTransaction();
        tx.setMemberId(member.getMemberId());
        tx.setType("CREDIT");
        tx.setAmount(amount);
        tx.setBalanceAfter(newBalance);
        tx.setSourceType("REFERRAL_REWARD");
        tx.setSourceId(reward.getId());
        tx.setRemarks("Wallet credit — " + reward.getRewardCode());
        walletTransactionRepository.save(tx);

        financialEventService.onReferralRewardIssued(reward);
    }

    private void extendMembership(ReferralReward reward) {
        Member member = memberRepository.findByMemberId(reward.getMemberId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + reward.getMemberId()));

        int days = reward.getRewardValue() != null ? reward.getRewardValue().intValue() : 0;
        LocalDateTime base = member.getExpiryDate() != null ? member.getExpiryDate() : LocalDateTime.now();
        LocalDateTime newExpiry = base.plusDays(days);
        member.setExpiryDate(newExpiry);
        member.setMembershipEndDate(newExpiry);
        memberRepository.save(member);

        reward.setRemarks("Membership extended by " + days + " day(s): "
                + base.toLocalDate() + " -> " + newExpiry.toLocalDate());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private ReferralReward findOrThrow(Long id) {
        return rewardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reward not found: " + id));
    }

    private void audit(ReferralReward reward, RewardAuditAction action, String remarks) {
        auditLogRepository.save(new RewardAuditLog(reward.getId(), action, currentUser(), remarks));
    }

    private void notifyRedeemed(ReferralReward reward) {
        memberRepository.findByMemberId(reward.getMemberId()).ifPresent(member -> {
            if (member.getUserId() != null) {
                notificationService.notifyUser(member.getUserId(), "Reward Redeemed",
                        reward.getRewardName() + " has been redeemed.", "SUCCESS", "LOW", "REFERRALS",
                        reward.getId(), "/my-rewards", "REWARD_REDEEMED_USER_" + reward.getId());
            }
        });
    }

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return "SYSTEM";
        }
        return auth.getName();
    }
}
