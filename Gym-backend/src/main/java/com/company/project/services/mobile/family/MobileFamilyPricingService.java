package com.company.project.services.mobile.family;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.MembershipPlan;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.services.MemberService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Authoritative pricing for a mobile Family/Couple purchase, mirroring what the web
 * app's add-member form charges for the same family:
 *  - "family_head" billing mode: ONE combined invoice on the head — price-per-member
 *    × headcount when auto-calculate is on, else the plan's flat price
 *    (MemberService.createMember computes the same figure).
 *  - "individual" billing mode (default): the head pays the plan price; each adult
 *    family member gets their own membership at the plan price — or at the price
 *    of the plan they picked for themselves; each minor's fee (the plan's
 *    price-per-member, 0 if unset) folds onto the head's invoice.
 * The buyer pays the whole family's total in the app.
 */
@Service
public class MobileFamilyPricingService {

    private final MembershipPlanRepository planRepository;
    private final MemberService memberService;

    public MobileFamilyPricingService(MembershipPlanRepository planRepository, MemberService memberService) {
        this.planRepository = planRepository;
        this.memberService = memberService;
    }

    public static final class Quote {
        private final MembershipPlan plan;
        private final boolean familyHeadBilling;
        private final BigDecimal headFee;
        private final List<BigDecimal> memberFees;
        private final List<String> memberPlanNames;
        private final BigDecimal total;

        Quote(MembershipPlan plan, boolean familyHeadBilling, BigDecimal headFee, List<BigDecimal> memberFees,
              List<String> memberPlanNames, BigDecimal total) {
            this.plan = plan;
            this.familyHeadBilling = familyHeadBilling;
            this.headFee = headFee;
            this.memberFees = memberFees;
            this.memberPlanNames = memberPlanNames;
            this.total = total;
        }

        public MembershipPlan getPlan() { return plan; }
        public boolean isFamilyHeadBilling() { return familyHeadBilling; }
        /** The head's own fee — under family_head billing, the whole family's invoice. */
        public BigDecimal getHeadFee() { return headFee; }
        /** Per family member, in request order. Informational (the head's share) under family_head billing. */
        public List<BigDecimal> getMemberFees() { return memberFees; }
        /** Per family member, the plan they'll be on (their own pick, else the head's). */
        public List<String> getMemberPlanNames() { return memberPlanNames; }
        public BigDecimal getTotal() { return total; }
    }

    /** An active Family or Couple plan, or 400/404. */
    public MembershipPlan resolveFamilyPlan(Long planId) {
        if (planId == null) {
            throw new IllegalArgumentException("planId is required");
        }
        MembershipPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + planId));
        if (!"Active".equalsIgnoreCase(plan.getStatus())) {
            throw new IllegalArgumentException("This plan is no longer available.");
        }
        String type = plan.getPlanType();
        if (!"Family".equalsIgnoreCase(type) && !"Couple".equalsIgnoreCase(type)) {
            throw new IllegalArgumentException("This plan is not a Family or Couple plan.");
        }
        return plan;
    }

    /**
     * An adult family member's own plan choice: active, in this gym, and an
     * individual plan (not another Family/Couple plan).
     */
    public MembershipPlan resolveMemberPlan(Long planId) {
        MembershipPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("Selected plan not found: " + planId));
        if (!"Active".equalsIgnoreCase(plan.getStatus())) {
            throw new IllegalArgumentException("The plan \"" + plan.getName() + "\" is no longer available.");
        }
        if ("Family".equalsIgnoreCase(plan.getPlanType()) || "Couple".equalsIgnoreCase(plan.getPlanType())) {
            throw new IllegalArgumentException("A family member's own plan can't be a Family or Couple plan.");
        }
        return plan;
    }

    public Quote quote(MembershipPlan plan, List<Boolean> isMinorFlags) {
        return quote(plan, isMinorFlags, null);
    }

    /**
     * memberPlanIds (optional, aligned with isMinorFlags): an adult's own plan under
     * individual billing. Ignored for minors and under family_head billing, where
     * nobody has a plan of their own — same as the web form.
     */
    public Quote quote(MembershipPlan plan, List<Boolean> isMinorFlags, List<Long> memberPlanIds) {
        BigDecimal planPrice = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;
        boolean familyHeadBilling = "family_head".equalsIgnoreCase(plan.getFamilyBillingMode());
        List<BigDecimal> memberFees = new ArrayList<>();
        List<String> memberPlanNames = new ArrayList<>();
        isMinorFlags.forEach(m -> memberPlanNames.add(plan.getName()));

        if (familyHeadBilling) {
            boolean autoCalc = !Boolean.FALSE.equals(plan.getAutoCalculateTotal()) && plan.getPricePerMember() != null;
            BigDecimal total;
            if (autoCalc) {
                total = memberService.memberPriceForIndex(plan, 0);
                for (int i = 0; i < isMinorFlags.size(); i++) {
                    BigDecimal share = memberService.memberPriceForIndex(plan, i + 1);
                    memberFees.add(share);
                    total = total.add(share);
                }
            } else {
                total = planPrice;
                isMinorFlags.forEach(m -> memberFees.add(BigDecimal.ZERO));
            }
            return new Quote(plan, true, total, memberFees, memberPlanNames, total);
        }

        BigDecimal minorFee = plan.getPricePerMember() != null ? plan.getPricePerMember() : BigDecimal.ZERO;
        BigDecimal total = planPrice;
        for (int i = 0; i < isMinorFlags.size(); i++) {
            BigDecimal fee;
            if (Boolean.TRUE.equals(isMinorFlags.get(i))) {
                fee = minorFee;
            } else {
                Long ownPlanId = memberPlanIds != null && i < memberPlanIds.size() ? memberPlanIds.get(i) : null;
                if (ownPlanId != null && !ownPlanId.equals(plan.getId())) {
                    MembershipPlan ownPlan = resolveMemberPlan(ownPlanId);
                    fee = ownPlan.getPrice() != null ? ownPlan.getPrice() : BigDecimal.ZERO;
                    memberPlanNames.set(i, ownPlan.getName());
                } else {
                    fee = planPrice;
                }
            }
            memberFees.add(fee);
            total = total.add(fee);
        }
        return new Quote(plan, false, planPrice, memberFees, memberPlanNames, total);
    }

    /**
     * The legs actually paid, capped at the family total: the client's breakdown
     * when it sent one, else a single leg of paidAmount via paymentMethodUsed.
     */
    public List<PaymentSplitDTO> paidLegs(List<PaymentSplitDTO> breakdown, String method, BigDecimal paidAmount, BigDecimal total) {
        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (breakdown != null && !breakdown.isEmpty()) {
            for (PaymentSplitDTO leg : breakdown) {
                if (leg.getAmount() != null && leg.getAmount().compareTo(BigDecimal.ZERO) > 0) legs.add(leg);
            }
        } else if (paidAmount != null && paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            legs.add(new PaymentSplitDTO(method, paidAmount, null));
        }
        return allocate(legs, List.of(total)).get(0);
    }

    /**
     * Splits the paid legs across receipts in order — each bucket is filled
     * completely before the next gets anything, splitting a leg where it straddles
     * two buckets. Returns one leg list per bucket (empty when nothing reached it).
     */
    public List<List<PaymentSplitDTO>> allocate(List<PaymentSplitDTO> legs, List<BigDecimal> bucketFees) {
        List<List<PaymentSplitDTO>> result = new ArrayList<>();
        int legIdx = 0;
        BigDecimal legRemaining = legs.isEmpty() ? BigDecimal.ZERO : legs.get(0).getAmount();
        for (BigDecimal fee : bucketFees) {
            List<PaymentSplitDTO> bucket = new ArrayList<>();
            BigDecimal need = fee != null ? fee : BigDecimal.ZERO;
            while (need.compareTo(BigDecimal.ZERO) > 0 && legIdx < legs.size()) {
                BigDecimal take = need.min(legRemaining);
                if (take.compareTo(BigDecimal.ZERO) > 0) {
                    bucket.add(copyWithAmount(legs.get(legIdx), take));
                    need = need.subtract(take);
                    legRemaining = legRemaining.subtract(take);
                }
                if (legRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                    legIdx++;
                    legRemaining = legIdx < legs.size() ? legs.get(legIdx).getAmount() : BigDecimal.ZERO;
                }
            }
            result.add(bucket);
        }
        return result;
    }

    public static BigDecimal sum(List<PaymentSplitDTO> legs) {
        return legs.stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static PaymentSplitDTO copyWithAmount(PaymentSplitDTO src, BigDecimal amount) {
        PaymentSplitDTO leg = new PaymentSplitDTO(src.getMethod(), amount, src.getReference());
        leg.setCardType(src.getCardType());
        leg.setChequeNumber(src.getChequeNumber());
        leg.setChequeDate(src.getChequeDate());
        leg.setBankName(src.getBankName());
        leg.setBankAccountCode(src.getBankAccountCode());
        leg.setBankAccountName(src.getBankAccountName());
        leg.setOnlinePaymentType(src.getOnlinePaymentType());
        leg.setProviderName(src.getProviderName());
        return leg;
    }
}
