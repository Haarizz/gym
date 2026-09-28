package com.company.project.services.mobile.family;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.MembershipPlan;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.services.MemberService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileFamilyPricingServiceTest {

    @Mock
    private MembershipPlanRepository planRepository;

    @Mock
    private MemberService memberService;

    @InjectMocks
    private MobileFamilyPricingService pricingService;

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    private static MembershipPlan familyPlan(String billingMode) {
        MembershipPlan plan = new MembershipPlan();
        plan.setId(7L);
        plan.setName("Family Gold");
        plan.setPlanType("Family");
        plan.setStatus("Active");
        plan.setPrice(bd("1000"));
        plan.setPricePerMember(bd("300"));
        plan.setFamilyBillingMode(billingMode);
        return plan;
    }

    @Test
    @DisplayName("Individual billing: head + each adult at plan price, minors at price-per-member")
    void individualQuote() {
        MobileFamilyPricingService.Quote q = pricingService.quote(familyPlan("individual"), List.of(false, true, true));

        assertFalse(q.isFamilyHeadBilling());
        assertEquals(bd("1000"), q.getHeadFee());
        assertEquals(List.of(bd("1000"), bd("300"), bd("300")), q.getMemberFees());
        assertEquals(bd("2600"), q.getTotal());
    }

    @Test
    @DisplayName("family_head billing with auto-calculate: one combined invoice from price-per-member")
    void familyHeadAutoCalcQuote() {
        when(memberService.memberPriceForIndex(any(), anyInt())).thenReturn(bd("300"));

        MobileFamilyPricingService.Quote q = pricingService.quote(familyPlan("family_head"), List.of(false, true));

        assertTrue(q.isFamilyHeadBilling());
        assertEquals(bd("900"), q.getTotal());
        assertEquals(q.getTotal(), q.getHeadFee());
    }

    @Test
    @DisplayName("family_head billing without auto-calculate: plan's flat price")
    void familyHeadFlatQuote() {
        MembershipPlan plan = familyPlan("family_head");
        plan.setAutoCalculateTotal(false);

        MobileFamilyPricingService.Quote q = pricingService.quote(plan, List.of(false, false));

        assertEquals(bd("1000"), q.getTotal());
        assertEquals(List.of(BigDecimal.ZERO, BigDecimal.ZERO), q.getMemberFees());
    }

    @Test
    @DisplayName("Non-family plans are rejected")
    void rejectsIndividualPlan() {
        MembershipPlan plan = familyPlan("individual");
        plan.setPlanType("Standard");
        when(planRepository.findById(7L)).thenReturn(Optional.of(plan));

        assertThrows(IllegalArgumentException.class, () -> pricingService.resolveFamilyPlan(7L));
    }

    @Test
    @DisplayName("Allocation fills receipts in order and splits a leg across two receipts")
    void allocateSplitsLegs() {
        List<PaymentSplitDTO> legs = List.of(
                new PaymentSplitDTO("Card", bd("1200"), "AUTH1"),
                new PaymentSplitDTO("Online Payment", bd("500"), "TXN9"));

        List<List<PaymentSplitDTO>> buckets = pricingService.allocate(legs, List.of(bd("1000"), bd("300"), bd("1000")));

        assertEquals(1, buckets.get(0).size());
        assertEquals(bd("1000"), buckets.get(0).get(0).getAmount());
        assertEquals("Card", buckets.get(0).get(0).getMethod());

        // Minor's 300: the card leg's remaining 200 + 100 from the online leg, reference kept.
        assertEquals(2, buckets.get(1).size());
        assertEquals("Card", buckets.get(1).get(0).getMethod());
        assertEquals(bd("200"), buckets.get(1).get(0).getAmount());
        assertEquals("Online Payment", buckets.get(1).get(1).getMethod());
        assertEquals(bd("100"), buckets.get(1).get(1).getAmount());
        assertEquals("TXN9", buckets.get(1).get(1).getReference());

        // Adult's 1000 only gets the online leg's remaining 400 — partially paid.
        assertEquals(1, buckets.get(2).size());
        assertEquals(bd("400"), MobileFamilyPricingService.sum(buckets.get(2)));
    }

    @Test
    @DisplayName("Payment is capped at the total, and nothing paid means empty legs")
    void paidLegsCapped() {
        assertEquals(bd("2600"), MobileFamilyPricingService.sum(
                pricingService.paidLegs(null, "Card", bd("5000"), bd("2600"))));
        assertTrue(pricingService.paidLegs(null, "Credit", BigDecimal.ZERO, bd("2600")).isEmpty());
    }

    @Test
    @DisplayName("Individual billing: an adult's own plan choice sets their fee and plan; minors ignore it")
    void adultOwnPlan() {
        MembershipPlan basic = new MembershipPlan();
        basic.setId(9L);
        basic.setName("Basic Monthly");
        basic.setPlanType("Standard");
        basic.setStatus("Active");
        basic.setPrice(bd("400"));
        when(planRepository.findById(9L)).thenReturn(Optional.of(basic));

        MobileFamilyPricingService.Quote q = pricingService.quote(familyPlan("individual"),
                java.util.Arrays.asList(false, false, true), java.util.Arrays.asList(9L, null, 9L));

        assertEquals(List.of(bd("400"), bd("1000"), bd("300")), q.getMemberFees());
        assertEquals(List.of("Basic Monthly", "Family Gold", "Family Gold"), q.getMemberPlanNames());
        assertEquals(bd("2700"), q.getTotal());
    }

    @Test
    @DisplayName("A family member's own plan can't be another Family/Couple plan")
    void adultOwnPlanRejectsFamilyPlan() {
        MembershipPlan couple = familyPlan("individual");
        couple.setId(11L);
        couple.setPlanType("Couple");
        when(planRepository.findById(11L)).thenReturn(Optional.of(couple));

        assertThrows(IllegalArgumentException.class, () -> pricingService.quote(familyPlan("individual"),
                List.of(false), List.of(11L)));
    }

    @Test
    @DisplayName("family_head billing ignores plan choices — everyone is on the combined invoice")
    void familyHeadIgnoresOwnPlan() {
        MembershipPlan plan = familyPlan("family_head");
        plan.setAutoCalculateTotal(false);

        MobileFamilyPricingService.Quote q = pricingService.quote(plan, List.of(false), List.of(9L));

        assertEquals(bd("1000"), q.getTotal());
        verify(planRepository, never()).findById(9L);
    }
}
