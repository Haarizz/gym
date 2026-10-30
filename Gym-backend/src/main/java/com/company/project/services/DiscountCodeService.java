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
import java.time.LocalDate;

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
        return resolve(rawCode, gross, null);
    }

    /**
     * As resolve(code, gross), also checking the promotion's target audience lets `buyer`
     * use it. A null buyer skips that check (who is paying isn't known yet); redemption
     * checks it regardless.
     */
    public DiscountCodeDTO resolve(String rawCode, BigDecimal gross, PromotionAudience.Buyer buyer) {
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
        if (buyer != null) PromotionAudience.require(promo, buyer);
        return fromPromotion(promo, gross);
    }

    /**
     * A promotion picked by id rather than typed as a code (one without a code, e.g. claimed from
     * the app's offer banner): the same checks a promotion code gets, plus its target audience for
     * `buyer`; with `gross`, also the discount it gives on it.
     */
    public DiscountCodeDTO resolvePromotion(Long promotionId, BigDecimal gross, PromotionAudience.Buyer buyer) {
        PromotionCampaignResponseDTO promo = promotionService.getPromotionById(promotionId);
        LocalDate today = LocalDate.now();
        if (!"active".equalsIgnoreCase(promo.getStatus())) {
            throw new BusinessRuleViolationException(promo.getName() + " is not active.");
        }
        LocalDate start = promo.getStartDate() != null ? LocalDate.parse(promo.getStartDate()) : null;
        LocalDate end = promo.getEndDate() != null ? LocalDate.parse(promo.getEndDate()) : null;
        if (end != null && end.isBefore(today)) {
            throw new BusinessRuleViolationException(promo.getName() + " has expired.");
        }
        if (start != null && start.isAfter(today)) {
            throw new BusinessRuleViolationException(promo.getName() + " has not started yet.");
        }
        if (promo.getUsageLimit() != null && promo.getUsageCount() != null && promo.getUsageCount() >= promo.getUsageLimit()) {
            throw new BusinessRuleViolationException(promo.getName() + " has reached its usage limit.");
        }
        if (buyer != null) PromotionAudience.require(promo, buyer);
        return fromPromotion(promo, gross);
    }

    /** Spends a promotion picked by id at checkout (see resolvePromotion) and returns its discount on `gross`. */
    @Transactional
    public BigDecimal redeemPromotionAtCheckout(Long promotionId, BigDecimal gross, Long memberDbId) {
        BigDecimal discount = resolvePromotion(promotionId, gross, null).getDiscountAmount();
        promotionService.redeemPromotion(promotionId, gross.subtract(discount), discount, memberDbId);
        return discount;
    }

    private DiscountCodeDTO fromPromotion(PromotionCampaignResponseDTO promo, BigDecimal gross) {
        DiscountCodeDTO dto = new DiscountCodeDTO();
        dto.setSource("PROMOTION");
        dto.setPromotionId(promo.getId());
        dto.setCode(promo.getCode());
        dto.setName(promo.getName());
        dto.setDiscountType(promo.getDiscountType());
        dto.setDiscountValue(promo.getDiscountValue());
        dto.setMaximumDiscount(promo.getMaximumDiscount());
        dto.setMinimumPurchase(promo.getMinimumPurchase());
        if (gross != null) dto.setDiscountAmount(promotionDiscount(promo, gross));
        return dto;
    }

    /** The discount a promotion or coupon code gives `buyer` on `gross`, without spending it. */
    public BigDecimal previewDiscount(String code, BigDecimal gross, PromotionAudience.Buyer buyer) {
        return resolve(code, gross, buyer).getDiscountAmount();
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

    /** The Applicable Services entry that lets a promotion be used on add-on purchases. */
    public static final String SERVICE_ADDONS = "Add-ons";

    /**
     * A code typed at an add-on checkout, priced on `gross`. Only a promotion whose
     * Applicable Services include Add-ons qualifies — membership promotions and referral
     * coupons don't. `buyer` as in resolve(); null skips the audience check.
     */
    public DiscountCodeDTO resolveForAddon(String rawCode, BigDecimal gross, PromotionAudience.Buyer buyer) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        String code = rawCode.trim();

        PromotionCampaignResponseDTO promo;
        try {
            promo = promotionService.validateByCode(code);
        } catch (EntityNotFoundException notAPromotion) {
            if (isCoupon(code)) {
                throw new BusinessRuleViolationException("Referral coupons can't be used on add-ons");
            }
            throw new EntityNotFoundException("Invalid promotion code");
        }
        if (!appliesToAddons(promo)) {
            throw new BusinessRuleViolationException(promo.getName() + " can't be used on add-ons");
        }
        if (buyer != null) PromotionAudience.require(promo, buyer);
        return fromPromotion(promo, gross);
    }

    /** Spends an add-on promotion code (see resolveForAddon) at checkout; returns it with its discount on `gross`. */
    @Transactional
    public DiscountCodeDTO redeemForAddon(String code, BigDecimal gross, Long memberDbId) {
        DiscountCodeDTO resolved = resolveForAddon(code, gross, null);
        BigDecimal discount = resolved.getDiscountAmount();
        // Checks the target audience for this member
        promotionService.redeemPromotion(resolved.getPromotionId(), gross.subtract(discount), discount, memberDbId);
        return resolved;
    }

    static boolean appliesToAddons(PromotionCampaignResponseDTO promo) {
        if (promo.getApplicableServices() == null) return false;
        return promo.getApplicableServices().stream()
                .anyMatch(s -> s != null && s.replaceAll("[^A-Za-z]", "").equalsIgnoreCase("addons"));
    }

    private boolean isCoupon(String code) {
        try {
            couponService.validate(code.toUpperCase());
            return true;
        } catch (RuntimeException e) {
            return false;
        }
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
