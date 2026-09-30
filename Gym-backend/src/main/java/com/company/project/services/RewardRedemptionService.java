package com.company.project.services;

import com.company.project.entities.Coupon;
import com.company.project.entities.Member;
import com.company.project.entities.ReferralReward;
import com.company.project.entities.RewardAuditLog;
import com.company.project.entities.WalletTransaction;
import com.company.project.enums.PassContext;
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
import java.math.RoundingMode;
import java.time.LocalDate;
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
        } else if (reward.getRewardType() == RewardType.MEMBERSHIP_EXTENSION) {
            extendMembership(reward);
            reward.setStatus(RewardStatus.REDEEMED);
            reward.setRedeemedDate(LocalDateTime.now());
            rewardRepository.save(reward);
            auditLogRepository.save(new RewardAuditLog(reward.getId(), RewardAuditAction.MEMBERSHIP_EXTENDED,
                    "SYSTEM", reward.getRemarks()));
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
            case MEMBERSHIP_DISCOUNT, FREE_PT, FREE_CLASS -> {
                // Reward Passes are only spent by picking them at renewal/booking
                // (consumePass) — redeeming one here would mark it used without it
                // ever having been applied to anything.
                throw new BusinessRuleViolationException(
                        "This reward is a Reward Pass — apply it while renewing a membership or booking a session");
            }
            case GIFT, LOYALTY_POINTS -> {
                // Gift collection is a staff-confirmed action; loyalty points are marked
                // used once applied — neither needs an integration step beyond the
                // status transition itself.
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
                Long targetId = member.getUserId() != null ? member.getUserId() : member.getGlobalUserId();
                if (targetId != null) {
                    notificationService.notifyUser(targetId, "Reward Expiring Soon",
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

    // ── Reward Passes (MEMBERSHIP_DISCOUNT / FREE_PT / FREE_CLASS) ─────────────

    /**
     * Spends a member's Reward Pass on a renewal (MEMBERSHIP) or a booking (PT/CLASS).
     * Runs inside the caller's transaction, so a failed renewal/booking rolls the pass
     * back to its previous status. refId is the member id (MEMBERSHIP) or booking id.
     */
    public ReferralReward consumePass(Long rewardId, String memberId, PassContext context, Long refId) {
        ReferralReward reward = rewardRepository.findByIdForUpdate(rewardId)
                .orElseThrow(() -> new EntityNotFoundException("Reward not found: " + rewardId));
        requireSpendable(reward, memberId, context);

        reward.setStatus(RewardStatus.REDEEMED);
        reward.setRedeemedDate(LocalDateTime.now());
        reward.setConsumedContext(context == PassContext.MEMBERSHIP ? "MEMBERSHIP" : "BOOKING");
        reward.setConsumedRefId(refId);
        ReferralReward saved = rewardRepository.save(reward);
        audit(saved, RewardAuditAction.REDEEMED, context == PassContext.MEMBERSHIP
                ? "Reward Pass applied to membership renewal"
                : "Reward Pass used on booking #" + refId);
        notifyRedeemed(saved);
        return saved;
    }

    /** Gives a booking's Reward Pass back when that booking is cancelled or deleted. */
    public void restorePass(Long rewardId) {
        rewardRepository.findByIdForUpdate(rewardId).ifPresent(reward -> {
            if (reward.getStatus() != RewardStatus.REDEEMED || !"BOOKING".equals(reward.getConsumedContext())) {
                return;
            }
            boolean expired = reward.getExpiryDate() != null && reward.getExpiryDate().isBefore(LocalDate.now());
            reward.setStatus(expired ? RewardStatus.EXPIRED : RewardStatus.AVAILABLE);
            reward.setRedeemedDate(null);
            reward.setConsumedContext(null);
            reward.setConsumedRefId(null);
            rewardRepository.save(reward);
            audit(reward, expired ? RewardAuditAction.EXPIRED : RewardAuditAction.RESTORED,
                    expired ? "Booking cancelled — pass had already expired, not restored"
                            : "Booking cancelled — Reward Pass restored");
        });
    }

    /** Checks a pass could be spent and returns its discount on `gross`, without spending it (price previews). */
    @Transactional(readOnly = true)
    public BigDecimal previewPassDiscount(Long rewardId, String memberId, PassContext context, BigDecimal gross) {
        ReferralReward reward = findOrThrow(rewardId);
        requireSpendable(reward, memberId, context);
        return discountFor(reward.getRewardUnit(), reward.getRewardValue(), gross);
    }

    /** Checks a coupon code is usable and returns its discount on `gross`, without spending it. */
    @Transactional(readOnly = true)
    public BigDecimal previewCouponDiscount(String code, BigDecimal gross) {
        Coupon coupon = couponService.validate(code.trim().toUpperCase());
        return discountFor(coupon.getDiscountUnit(), coupon.getDiscountValue(), gross);
    }

    /** The discount a MEMBERSHIP_DISCOUNT pass gives on a fee of `gross` (never more than gross). */
    public BigDecimal passDiscount(Long rewardId, BigDecimal gross) {
        ReferralReward reward = findOrThrow(rewardId);
        return discountFor(reward.getRewardUnit(), reward.getRewardValue(), gross);
    }

    /** PERCENT → gross × value / 100; anything else is a flat amount. Capped at gross, never negative. */
    public static BigDecimal discountFor(String unit, BigDecimal value, BigDecimal gross) {
        BigDecimal base = gross != null ? gross.max(BigDecimal.ZERO) : BigDecimal.ZERO;
        if (value == null || value.signum() <= 0) return BigDecimal.ZERO;
        BigDecimal discount = "PERCENT".equalsIgnoreCase(unit)
                ? base.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : value;
        return discount.min(base).setScale(2, RoundingMode.HALF_UP);
    }

    private void requireSpendable(ReferralReward reward, String memberId, PassContext context) {
        if (memberId == null || !memberId.equals(reward.getMemberId())) {
            throw new BusinessRuleViolationException("This Reward Pass belongs to a different member");
        }
        if (!context.accepts(reward.getRewardType())) {
            throw new BusinessRuleViolationException("This Reward Pass can't be used for " + context.name().toLowerCase());
        }
        if (reward.getStatus() != RewardStatus.AVAILABLE && reward.getStatus() != RewardStatus.CLAIMED) {
            throw new BusinessRuleViolationException("Reward Pass is " + reward.getStatus().name().toLowerCase());
        }
        if (reward.getExpiryDate() != null && reward.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessRuleViolationException("Reward Pass has expired");
        }
    }

    // ── Shareable coupons ─────────────────────────────────────────────────────

    /**
     * Uses a COUPON reward's code at checkout. The code is shareable, so usedByMemberDbId
     * can be anyone (not necessarily the reward's owner). Returns the discount on `gross`.
     */
    public BigDecimal redeemCouponAtCheckout(String code, BigDecimal gross, Long usedByMemberDbId, String usedByName) {
        Coupon coupon = couponService.validate(code.trim().toUpperCase());
        BigDecimal discount = discountFor(coupon.getDiscountUnit(), coupon.getDiscountValue(), gross);
        couponService.consume(coupon.getCode()); // also flips the owning reward to REDEEMED once exhausted

        rewardRepository.findById(coupon.getRewardId()).ifPresent(reward -> {
            reward.setConsumedContext("COUPON");
            reward.setConsumedRefId(usedByMemberDbId);
            rewardRepository.save(reward);
            audit(reward, RewardAuditAction.REDEEMED, "Coupon " + coupon.getCode() + " used at checkout by "
                    + (usedByName != null ? usedByName : "member #" + usedByMemberDbId)
                    + " — discount " + discount);
        });
        return discount;
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
            Long targetId = member.getUserId() != null ? member.getUserId() : member.getGlobalUserId();
            if (targetId != null) {
                notificationService.notifyUser(targetId, "Reward Redeemed",
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
