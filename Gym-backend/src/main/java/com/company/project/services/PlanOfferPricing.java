package com.company.project.services;

import com.company.project.entities.MembershipPlan;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * A plan's manual offer (offer_type/offer_value, optionally between two dates) is the
 * one discount every member gets without a code. `price` stays the regular price;
 * everything that charges a member for a plan goes through effectivePrice().
 */
public final class PlanOfferPricing {

    public static final String PERCENTAGE = "percentage";
    public static final String FIXED = "fixed";

    private PlanOfferPricing() {}

    /** An offer is configured, has a positive value, and today is inside its dates. */
    public static boolean isActive(MembershipPlan plan, LocalDate today) {
        String type = plan.getOfferType();
        if (!PERCENTAGE.equalsIgnoreCase(type) && !FIXED.equalsIgnoreCase(type)) return false;
        if (plan.getOfferValue() == null || plan.getOfferValue().signum() <= 0) return false;
        if (plan.getOfferStartDate() != null && today.isBefore(plan.getOfferStartDate())) return false;
        return plan.getOfferEndDate() == null || !today.isAfter(plan.getOfferEndDate());
    }

    /** The running offer's discount on the plan price — 0 when there is none. Never more than the price. */
    public static BigDecimal discount(MembershipPlan plan, LocalDate today) {
        if (!isActive(plan, today)) return BigDecimal.ZERO;
        BigDecimal price = regularPrice(plan);
        BigDecimal value = plan.getOfferValue();
        BigDecimal discount = PERCENTAGE.equalsIgnoreCase(plan.getOfferType())
                ? price.multiply(value.min(BigDecimal.valueOf(100))).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : value;
        return discount.min(price).setScale(2, RoundingMode.HALF_UP);
    }

    /** What a member pays for the plan today, before any code or Reward Pass. */
    public static BigDecimal effectivePrice(MembershipPlan plan, LocalDate today) {
        if (!isActive(plan, today)) return regularPrice(plan); // unchanged, scale included
        return regularPrice(plan).subtract(discount(plan, today)).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal effectivePrice(MembershipPlan plan) {
        return effectivePrice(plan, LocalDate.now());
    }

    public static BigDecimal discount(MembershipPlan plan) {
        return discount(plan, LocalDate.now());
    }

    private static BigDecimal regularPrice(MembershipPlan plan) {
        return plan.getPrice() != null ? plan.getPrice().max(BigDecimal.ZERO) : BigDecimal.ZERO;
    }
}
