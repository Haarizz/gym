package com.company.project.services;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.entities.Coupon;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Resolves a code typed into a checkout's promo field. Promotion codes win; only
 * when no promotion has that code is it tried as a shareable coupon. A promotion
 * that exists but is inactive/expired/used up reports its own error rather than
 * falling through to coupons.
 */
@Service
@Transactional(readOnly = true)
public class DiscountCodeService {

    private final PromotionCampaignService promotionService;
    private final CouponService couponService;
    private final RewardRedemptionService rewardRedemptionService;

    public DiscountCodeService(PromotionCampaignService promotionService, CouponService couponService,
                               @Lazy RewardRedemptionService rewardRedemptionService) {
        this.promotionService = promotionService;
        this.couponService = couponService;
        this.rewardRedemptionService = rewardRedemptionService;
    }

    public DiscountCodeDTO resolve(String rawCode) {
        return resolve(rawCode, null);
    }

    /** As resolve(code), plus the discount the code gives on `gross` when one is passed. */
    public DiscountCodeDTO resolve(String rawCode, BigDecimal gross) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        String code = rawCode.trim();

        PromotionCampaignResponseDTO promo;
        try {
            promo = promotionService.validateByCode(code);
        } catch (EntityNotFoundException notAPromotion) {
            return fromCoupon(code, gross);
        }
        DiscountCodeDTO dto = new DiscountCodeDTO();
        dto.setSource("PROMOTION");
        dto.setPromotionId(promo.getId());
        dto.setCode(promo.getCode());
        dto.setName(promo.getName());
        dto.setDiscountType(promo.getDiscountType());
        dto.setDiscountValue(promo.getDiscountValue());
        if (gross != null) dto.setDiscountAmount(promotionDiscount(promo, gross));
        return dto;
    }

    /** The discount a promotion or coupon code gives on `gross`, without spending it. */
    public BigDecimal previewDiscount(String code, BigDecimal gross) {
        return resolve(code, gross).getDiscountAmount();
    }

    /**
     * Spends a promotion or coupon code at checkout and returns its discount on `gross`.
     * A promotion is recorded as a redemption (usage count, revenue, savings); a coupon
     * is consumed the same way RewardRedemptionService always has.
     */
    @Transactional
    public BigDecimal redeemAtCheckout(String code, BigDecimal gross, Long memberDbId, String memberName) {
        DiscountCodeDTO resolved = resolve(code, gross);
        if ("COUPON".equals(resolved.getSource())) {
            return rewardRedemptionService.redeemCouponAtCheckout(code, gross, memberDbId, memberName);
        }
        BigDecimal discount = resolved.getDiscountAmount();
        promotionService.redeemPromotion(resolved.getPromotionId(), gross.subtract(discount), discount, memberDbId);
        return discount;
    }

    /**
     * percentage → gross × value / 100 (capped at maximumDiscount), free → all of gross,
     * anything else a flat amount. Never more than gross; rejects a gross under minimumPurchase.
     */
    static BigDecimal promotionDiscount(PromotionCampaignResponseDTO promo, BigDecimal gross) {
        BigDecimal base = gross.max(BigDecimal.ZERO);
        if (promo.getMinimumPurchase() != null && base.compareTo(promo.getMinimumPurchase()) < 0) {
            throw new BusinessRuleViolationException("This promotion needs a minimum purchase of "
                    + promo.getMinimumPurchase().setScale(2, RoundingMode.HALF_UP));
        }
        // No type → percentage, as the web checkout has always treated it.
        String type = promo.getDiscountType() != null ? promo.getDiscountType().toLowerCase() : "percentage";
        BigDecimal value = promo.getDiscountValue() != null ? promo.getDiscountValue() : BigDecimal.ZERO;
        BigDecimal discount = switch (type) {
            case "percentage" -> base.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case "free" -> base;
            case "fixed" -> value;
            default -> throw new BusinessRuleViolationException("This promotion doesn't give a price discount");
        };
        if (promo.getMaximumDiscount() != null && promo.getMaximumDiscount().signum() > 0) {
            discount = discount.min(promo.getMaximumDiscount());
        }
        return discount.max(BigDecimal.ZERO).min(base).setScale(2, RoundingMode.HALF_UP);
    }

    private DiscountCodeDTO fromCoupon(String code, BigDecimal gross) {
        Coupon coupon;
        try {
            coupon = couponService.validate(code.toUpperCase());
        } catch (EntityNotFoundException e) {
            throw new EntityNotFoundException("Invalid promotion or coupon code");
        }
        DiscountCodeDTO dto = new DiscountCodeDTO();
        dto.setSource("COUPON");
        dto.setCode(coupon.getCode());
        dto.setName("Referral coupon " + coupon.getCode());
        dto.setDiscountType("PERCENT".equalsIgnoreCase(coupon.getDiscountUnit()) ? "percentage" : "fixed");
        dto.setDiscountValue(coupon.getDiscountValue());
        if (gross != null) {
            dto.setDiscountAmount(RewardRedemptionService.discountFor(coupon.getDiscountUnit(), coupon.getDiscountValue(), gross));
        }
        return dto;
    }
}
