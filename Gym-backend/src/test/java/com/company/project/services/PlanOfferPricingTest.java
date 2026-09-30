package com.company.project.services;

import com.company.project.entities.MembershipPlan;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlanOfferPricingTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);

    private MembershipPlan plan(String price, String type, String value, LocalDate start, LocalDate end) {
        MembershipPlan p = new MembershipPlan();
        p.setPrice(new BigDecimal(price));
        p.setOfferType(type);
        p.setOfferValue(value != null ? new BigDecimal(value) : null);
        p.setOfferStartDate(start);
        p.setOfferEndDate(end);
        return p;
    }

    @Test
    void noOfferChargesTheRegularPrice() {
        MembershipPlan p = plan("902", null, null, null, null);
        assertFalse(PlanOfferPricing.isActive(p, TODAY));
        assertEquals(new BigDecimal("902"), PlanOfferPricing.effectivePrice(p, TODAY));
    }

    @Test
    void fixedAndPercentageOffers() {
        assertEquals(new BigDecimal("852.00"), PlanOfferPricing.effectivePrice(plan("902", "fixed", "50", null, null), TODAY));
        assertEquals(new BigDecimal("811.80"), PlanOfferPricing.effectivePrice(plan("902", "percentage", "10", null, null), TODAY));
        // Never below zero.
        assertEquals(new BigDecimal("0.00"), PlanOfferPricing.effectivePrice(plan("40", "fixed", "50", null, null), TODAY));
    }

    @Test
    void offerOnlyRunsBetweenItsDates() {
        MembershipPlan running = plan("902", "fixed", "50", TODAY, TODAY);
        assertTrue(PlanOfferPricing.isActive(running, TODAY));

        MembershipPlan upcoming = plan("902", "fixed", "50", TODAY.plusDays(1), null);
        assertEquals(new BigDecimal("902"), PlanOfferPricing.effectivePrice(upcoming, TODAY));

        MembershipPlan ended = plan("902", "fixed", "50", null, TODAY.minusDays(1));
        assertEquals(BigDecimal.ZERO, PlanOfferPricing.discount(ended, TODAY));
    }
}
