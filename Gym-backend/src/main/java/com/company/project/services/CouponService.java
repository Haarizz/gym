package com.company.project.services;

import com.company.project.entities.Coupon;
import com.company.project.entities.ReferralReward;
import com.company.project.enums.RewardStatus;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CouponRepository;
import com.company.project.repositories.ReferralRewardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Generates and validates coupons for COUPON-type rewards. A coupon is created
 * lazily the moment its reward is generated (see RewardRedemptionService) so
 * "Copy Coupon" in My Rewards always has a code ready, and consumed at
 * checkout (add-member / renew-upgrade / member-addons).
 */
@Service
@Transactional
public class CouponService {

    private final CouponRepository couponRepository;
    private final ReferralRewardRepository rewardRepository;

    public CouponService(CouponRepository couponRepository, ReferralRewardRepository rewardRepository) {
        this.couponRepository = couponRepository;
        this.rewardRepository = rewardRepository;
    }

    public Coupon generateForReward(ReferralReward reward) {
        return couponRepository.findByRewardId(reward.getId()).orElseGet(() -> {
            Coupon coupon = new Coupon();
            coupon.setCode(generateUniqueCode());
            coupon.setRewardId(reward.getId());
            coupon.setDiscountValue(reward.getRewardValue());
            coupon.setDiscountUnit("AMOUNT");
            coupon.setCurrency(reward.getCurrency());
            coupon.setExpiryDate(reward.getExpiryDate());
            coupon.setMaxUses(1);
            coupon.setUsedCount(0);
            coupon.setStatus("ACTIVE");
            return couponRepository.save(coupon);
        });
    }

    @Transactional(readOnly = true)
    public Coupon validate(String code) {
        Coupon coupon = couponRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Invalid coupon code"));

        if (!"ACTIVE".equals(coupon.getStatus())) {
            throw new BusinessRuleViolationException("Coupon is " + coupon.getStatus().toLowerCase());
        }
        if (coupon.getExpiryDate() != null && coupon.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BusinessRuleViolationException("Coupon has expired");
        }
        if (coupon.getMaxUses() != null && coupon.getUsedCount() != null
                && coupon.getUsedCount() >= coupon.getMaxUses()) {
            throw new BusinessRuleViolationException("Coupon has already been used");
        }
        return coupon;
    }

    /** Consumes one use of a coupon and marks its underlying reward REDEEMED once exhausted. */
    public Coupon consume(String code) {
        Coupon coupon = validate(code);
        coupon.setUsedCount((coupon.getUsedCount() != null ? coupon.getUsedCount() : 0) + 1);
        if (coupon.getUsedCount() >= coupon.getMaxUses()) {
            coupon.setStatus("USED");
            rewardRepository.findById(coupon.getRewardId()).ifPresent(reward -> {
                reward.setStatus(RewardStatus.REDEEMED);
                reward.setRedeemedDate(LocalDateTime.now());
                rewardRepository.save(reward);
            });
        }
        return couponRepository.save(coupon);
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = "GYM" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        } while (couponRepository.existsByCode(code));
        return code;
    }
}
