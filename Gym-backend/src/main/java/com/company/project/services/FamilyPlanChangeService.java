package com.company.project.services;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.FamilyPlanChangeQuoteDTO;
import com.company.project.dto.FamilyPlanChangeRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MinorChargeDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.services.mobile.family.MobileFamilyPricingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Staff renewal that can also change who is in a Couple/Family membership (BG_75):
 * Individual → Couple/Family, Couple ↔ Family, Couple/Family → Individual, or a
 * same-plan renewal that adds/removes people. The family after the change is the
 * head + kept current members + linked existing members + new people.
 *
 * Billing follows the target plan, exactly as at signup (createMember) and the
 * mobile conversion (MobileFamilyPurchaseService):
 *  - family_head billing: one invoice on the head for everyone, priced per member.
 *  - individual billing: the head pays the plan price; minors are billed onto the
 *    head's invoice; each NEW adult gets their own membership + receipt. Adults
 *    who already pay for their own membership keep renewing on their own.
 * People removed from the family are detached: they become standalone members and
 * keep the period already paid for, then renew on their own (agreed with the gym).
 *
 * quote() and apply() share build(), so what staff are shown is what is charged.
 */
@Service
@Transactional
public class FamilyPlanChangeService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;
    private final MembershipFreezeService freezeService;
    private final MobileFamilyPricingService pricingService;
    private final RewardRedemptionService rewardRedemptionService;

    public FamilyPlanChangeService(MemberService memberService, MemberRepository memberRepository,
                                   MembershipPlanRepository planRepository, MembershipFreezeService freezeService,
                                   MobileFamilyPricingService pricingService,
                                   RewardRedemptionService rewardRedemptionService) {
        this.memberService = memberService;
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.freezeService = freezeService;
        this.pricingService = pricingService;
        this.rewardRedemptionService = rewardRedemptionService;
    }

    private static final String KEEP = "KEEP", LINK = "LINK", NEW = "NEW";
    private static final String ON_HEAD = "HEAD", OWN = "OWN", NONE = "NONE";

    /** One person in the family after the change. */
    private static final class Person {
        Member existing;        // KEEP / LINK
        FamilyMemberDTO fresh;  // NEW
        String action;
        String name;
        String relationship;
        boolean minor;
        String billing;
        BigDecimal fee = BigDecimal.ZERO;
    }

    private record Change(Member head, MembershipPlan plan, boolean group, boolean familyHeadBilling,
                          List<Person> family, List<Member> detached,
                          BigDecimal headOwnFee, BigDecimal billedToHeadFees, BigDecimal rewardDiscount,
                          FamilyPlanChangeQuoteDTO quote) {}

    @Transactional(readOnly = true)
    public FamilyPlanChangeQuoteDTO quote(Long headId, FamilyPlanChangeRequestDTO req) {
        return build(headId, req).quote();
    }

    public MemberResponseDTO apply(Long headId, FamilyPlanChangeRequestDTO req) {
        Change c = build(headId, req);
        // Same as every staff renewal (renewEndingFreeze): a renewed plan doesn't start frozen.
        freezeService.endFreezeForRenewal(headId);
        Member head = memberRepository.findById(headId).orElseThrow();
        MembershipPlan plan = c.plan();

        // 1. People leaving the family.
        for (Member d : c.detached()) {
            detach(d);
        }

        // 2. Current/linked members moving onto this family's billing.
        for (Person p : c.family()) {
            if (p.existing == null) continue;
            Member m = p.existing;
            if (LINK.equals(p.action)) {
                m.setFamilyHeadId(head.getMemberId());
                m.setIsFamilyHead(false);
                m.setIsMinor(p.minor);
            }
            m.setRelationshipToHead(p.relationship);
            m.setMembershipType(plan.getPlanType());
            if (ON_HEAD.equals(p.billing)) {
                m.setBilledToHead(true);
                m.setOutstandingBalance(null);
                m.setPaymentStatus(null);
            } else if (OWN.equals(p.billing)) {
                m.setBilledToHead(false);
            }
            memberRepository.save(m);
        }

        // 3. Split what was collected across the receipts, head's invoice first (same
        //    order as the mobile conversion), then each adult paying for their own.
        BigDecimal headDue = c.headOwnFee().subtract(c.rewardDiscount()).max(BigDecimal.ZERO)
                .add(c.billedToHeadFees());
        List<BigDecimal> buckets = new ArrayList<>();
        buckets.add(headDue);
        List<Person> ownPayers = c.family().stream().filter(p -> OWN.equals(p.billing)).toList();
        ownPayers.forEach(p -> buckets.add(p.fee));
        List<PaymentSplitDTO> paid = pricingService.paidLegs(req.getPaymentBreakdown(), req.getPaymentMethod(),
                req.getAmountReceived(), c.quote().getTotalDue());
        List<List<PaymentSplitDTO>> allocation = pricingService.allocate(paid, buckets);

        // 4. The head's renewal — plan change, expiry, receipt and ledger post.
        head.setIsFamilyHead(c.group() && !c.family().isEmpty());
        memberRepository.save(head);
        List<PaymentSplitDTO> headLegs = allocation.get(0);
        boolean headPaidInFull = MobileFamilyPricingService.sum(headLegs).compareTo(headDue) >= 0;
        List<MinorChargeDTO> charges = new ArrayList<>();
        for (Person p : c.family()) {
            if (!ON_HEAD.equals(p.billing)) continue;
            charges.add(new MinorChargeDTO(p.existing != null ? p.existing.getMemberId() : null,
                    p.existing != null ? p.existing.getId() : null, p.name, p.fee, headPaidInFull));
        }
        RenewalRequestDTO headRenewal = renewalFor(plan, c.headOwnFee(), headLegs, req);
        headRenewal.setBilledToHeadFeeTotal(c.billedToHeadFees());
        headRenewal.setMinorCharges(charges.isEmpty() ? null : charges);
        headRenewal.setRewardPassId(req.getRewardPassId());
        headRenewal.setCouponCode(req.getCouponCode());
        memberService.renewMember(headId, headRenewal);
        head = memberRepository.findById(headId).orElseThrow();

        // 5. Everyone on the head's invoice moves in step with the head.
        for (Person p : c.family()) {
            if (p.existing == null || !ON_HEAD.equals(p.billing)) continue;
            Member m = p.existing;
            m.setMembershipPlan(plan.getName());
            m.setMembershipFee(p.fee); // informational share; the head's receipt is the bill
            m.setMembershipEndDate(head.getMembershipEndDate());
            m.setExpiryDate(head.getExpiryDate());
            m.setMembershipStatus("active");
            memberRepository.save(m);
        }

        // 6. Adults paying for their own membership: renew existing ones, register new ones.
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < ownPayers.size(); i++) {
            Person p = ownPayers.get(i);
            List<PaymentSplitDTO> legs = allocation.get(i + 1);
            if (p.existing != null) {
                memberService.renewMember(p.existing.getId(), renewalFor(plan, p.fee, legs, req));
            } else {
                applyOwnPayment(p.fresh, plan, p.fee, legs, req);
                memberService.registerFamilyAdult(p.fresh, head, now);
            }
        }

        // 7. New people billed to the head.
        for (Person p : c.family()) {
            if (p.fresh == null || !ON_HEAD.equals(p.billing)) continue;
            p.fresh.setProcessedByStaffId(req.getProcessedByStaffId());
            memberService.createBilledToHeadRecord(p.fresh, head, p.fee, now);
        }

        return MemberResponseDTO.fromEntity(memberRepository.findById(headId).orElseThrow());
    }

    // ── Validation + pricing (shared by quote and apply) ─────────────────────

    private Change build(Long headId, FamilyPlanChangeRequestDTO req) {
        Member head = memberRepository.findById(headId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + headId));
        if (head.getFamilyHeadId() != null || head.isEffectivelyBilledToHead()) {
            throw new BusinessRuleViolationException(head.getName() + " is part of another member's family — "
                    + "renew them from their family head.");
        }
        if ("PENDING".equals(head.getApprovalStatus())) {
            throw new BusinessRuleViolationException(head.getName() + "'s payment is awaiting approval — "
                    + "approve or reject it first.");
        }
        if (req.getPlanName() == null || req.getPlanName().isBlank()) {
            throw new IllegalArgumentException("Select a plan.");
        }
        MembershipPlan plan = planRepository.findByName(req.getPlanName())
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + req.getPlanName()));
        if (!"Active".equalsIgnoreCase(plan.getStatus())) {
            throw new IllegalArgumentException("The plan \"" + plan.getName() + "\" is no longer available.");
        }
        boolean couple = "Couple".equalsIgnoreCase(plan.getPlanType());
        boolean group = couple || "Family".equalsIgnoreCase(plan.getPlanType());
        boolean familyHeadBilling = group && "family_head".equalsIgnoreCase(plan.getFamilyBillingMode());

        // Who stays, who leaves.
        List<Member> current = head.getMemberId() != null
                ? memberRepository.findByFamilyHeadId(head.getMemberId()) : List.of();
        Set<Long> currentIds = new HashSet<>();
        current.forEach(m -> currentIds.add(m.getId()));
        Set<Long> keepIds = req.getKeepMemberIds() == null ? currentIds : new HashSet<>(req.getKeepMemberIds());
        for (Long id : keepIds) {
            if (!currentIds.contains(id)) {
                throw new IllegalArgumentException("Member " + id + " is not in " + head.getName() + "'s family.");
            }
        }
        List<Member> detached = new ArrayList<>();
        List<Person> family = new ArrayList<>();
        for (Member m : current) {
            if (group && keepIds.contains(m.getId())) {
                Person p = new Person();
                p.existing = m;
                p.action = KEEP;
                p.name = m.getName();
                p.relationship = m.getRelationshipToHead();
                p.minor = Boolean.TRUE.equals(m.getIsMinor());
                family.add(p);
            } else {
                detached.add(m);
            }
        }

        List<FamilyPlanChangeRequestDTO.LinkMemberDTO> links = req.getLinkMembers() != null ? req.getLinkMembers() : List.of();
        List<FamilyMemberDTO> fresh = req.getNewMembers() != null ? req.getNewMembers() : List.of();
        if (!group && (!links.isEmpty() || !fresh.isEmpty())) {
            throw new IllegalArgumentException("\"" + plan.getName() + "\" is an individual plan — choose a Couple "
                    + "or Family plan to add family members.");
        }

        Set<Long> seenLinks = new HashSet<>();
        for (FamilyPlanChangeRequestDTO.LinkMemberDTO link : links) {
            Member m = memberRepository.findById(link.getMemberId())
                    .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + link.getMemberId()));
            if (m.getId().equals(head.getId())) {
                throw new IllegalArgumentException(m.getName() + " is the family head — they can't also be a family member.");
            }
            if (!seenLinks.add(m.getId())) {
                throw new IllegalArgumentException(m.getName() + " was added twice.");
            }
            if (currentIds.contains(m.getId())) {
                throw new IllegalArgumentException(m.getName() + " is already in this family.");
            }
            if (m.getFamilyHeadId() != null) {
                throw new BusinessRuleViolationException(m.getName() + " already belongs to another family.");
            }
            if (Boolean.TRUE.equals(m.getIsFamilyHead()) && m.getMemberId() != null
                    && !memberRepository.findByFamilyHeadId(m.getMemberId()).isEmpty()) {
                throw new BusinessRuleViolationException(m.getName() + " is the head of their own family — "
                        + "move or remove their family members first.");
            }
            if ("PENDING".equals(m.getApprovalStatus())) {
                throw new BusinessRuleViolationException(m.getName() + "'s payment is awaiting approval.");
            }
            if (head.getBranchId() != null && m.getBranchId() != null && !head.getBranchId().equals(m.getBranchId())) {
                throw new BusinessRuleViolationException(m.getName() + " belongs to a different branch.");
            }
            if (link.getRelationship() == null || link.getRelationship().isBlank()) {
                throw new IllegalArgumentException("Enter " + m.getName() + "'s relationship to " + head.getName() + ".");
            }
            Person p = new Person();
            p.existing = m;
            p.action = LINK;
            p.name = m.getName();
            p.relationship = link.getRelationship().trim();
            p.minor = link.getIsMinor() != null ? link.getIsMinor() : Boolean.TRUE.equals(m.getIsMinor());
            family.add(p);
        }

        Set<String> seenEmails = new HashSet<>();
        for (FamilyMemberDTO fm : fresh) {
            if (fm.getName() == null || fm.getName().isBlank()) {
                throw new IllegalArgumentException("Each new family member needs a name.");
            }
            if (fm.getRelationship() == null || fm.getRelationship().isBlank()) {
                throw new IllegalArgumentException("Enter the relationship for " + fm.getName().trim() + ".");
            }
            if (fm.getEmail() != null && !fm.getEmail().isBlank()) {
                String email = fm.getEmail().trim().toLowerCase(Locale.ROOT);
                if (!seenEmails.add(email)) {
                    throw new IllegalArgumentException("Each family member needs a different email (" + email + " is used twice).");
                }
                if (memberRepository.existsByEmailIgnoreCase(email)) {
                    throw new BusinessRuleViolationException(email + " already belongs to a member — "
                            + "add them as an existing member instead.");
                }
                fm.setEmail(fm.getEmail().trim());
            }
            fm.setName(fm.getName().trim());
            fm.setRelationship(fm.getRelationship().trim());
            Person p = new Person();
            p.fresh = fm;
            p.action = NEW;
            p.name = fm.getName();
            p.relationship = fm.getRelationship();
            p.minor = Boolean.TRUE.equals(fm.getIsMinor());
            fm.setIsMinor(p.minor);
            family.add(p);
        }

        // Plan rules on the whole family after the change (same as signup).
        if (group) {
            long children = family.stream().filter(p -> p.minor).count();
            if (family.isEmpty()) {
                throw new IllegalArgumentException(couple ? "Add the connected partner for this Couple plan."
                        : "Add at least one family member for this Family plan.");
            }
            if (couple) {
                if (family.size() != 1) {
                    throw new IllegalArgumentException("Couple membership allows exactly one connected member.");
                }
                if (children > 0) {
                    throw new IllegalArgumentException("Couple membership only supports an adult connected member.");
                }
            } else {
                memberService.enforceFamilyMemberCaps(plan, 1 + family.size() - children, children);
            }
        }

        // Prices.
        BigDecimal planPrice = PlanOfferPricing.effectivePrice(plan);
        BigDecimal headOwnFee;
        BigDecimal headLineFee;
        BigDecimal billedToHeadFees = BigDecimal.ZERO;
        if (!group) {
            headOwnFee = planPrice;
            headLineFee = planPrice;
        } else if (familyHeadBilling) {
            boolean autoCalc = !Boolean.FALSE.equals(plan.getAutoCalculateTotal()) && plan.getPricePerMember() != null;
            headLineFee = autoCalc ? memberService.memberPriceForIndex(plan, 0) : planPrice;
            BigDecimal total = headLineFee;
            for (int i = 0; i < family.size(); i++) {
                Person p = family.get(i);
                p.billing = ON_HEAD;
                p.fee = autoCalc ? memberService.memberPriceForIndex(plan, i + 1) : BigDecimal.ZERO;
                total = total.add(p.fee);
            }
            // The head's membershipFee carries the whole family invoice, itemized —
            // the same shape createMember and renewFamily use.
            headOwnFee = total;
        } else {
            headOwnFee = planPrice;
            headLineFee = planPrice;
            BigDecimal minorFee = plan.getPricePerMember() != null ? plan.getPricePerMember() : BigDecimal.ZERO;
            for (Person p : family) {
                if (p.minor) {
                    p.billing = ON_HEAD;
                    p.fee = minorFee;
                    billedToHeadFees = billedToHeadFees.add(minorFee);
                } else if (KEEP.equals(p.action) && !p.existing.isEffectivelyBilledToHead()) {
                    p.billing = NONE; // already pays for their own membership
                } else if (LINK.equals(p.action)) {
                    p.billing = NONE; // keeps their own membership
                } else {
                    p.billing = OWN;  // new adult, or one moving off the head's invoice
                    p.fee = planPrice;
                }
            }
        }
        // Anyone moving onto the head's invoice must not bring an unpaid balance with
        // them — it would silently disappear (billed-to-head records carry none).
        for (Person p : family) {
            if (p.existing == null || !ON_HEAD.equals(p.billing) || p.existing.isEffectivelyBilledToHead()) continue;
            BigDecimal owed = p.existing.getOutstandingBalance();
            if (owed != null && owed.signum() > 0) {
                throw new BusinessRuleViolationException(p.name + " has an unpaid balance of " + owed
                        + " — collect it before adding them to the family invoice.");
            }
        }

        BigDecimal discount = req.getDiscountAmount() != null ? req.getDiscountAmount().max(BigDecimal.ZERO) : BigDecimal.ZERO;
        headOwnFee = headOwnFee.subtract(discount).max(BigDecimal.ZERO);

        BigDecimal rewardDiscount = BigDecimal.ZERO;
        boolean hasCoupon = req.getCouponCode() != null && !req.getCouponCode().isBlank();
        if (req.getRewardPassId() != null && hasCoupon) {
            throw new BusinessRuleViolationException("Apply either a Reward Pass or a coupon code, not both");
        }
        if (req.getRewardPassId() != null) {
            rewardDiscount = rewardRedemptionService.previewPassDiscount(req.getRewardPassId(), head.getMemberId(),
                    PassContext.MEMBERSHIP, headOwnFee);
        } else if (hasCoupon) {
            rewardDiscount = rewardRedemptionService.previewCouponDiscount(req.getCouponCode(), headOwnFee);
        }

        // The quote staff see.
        FamilyPlanChangeQuoteDTO quote = new FamilyPlanChangeQuoteDTO();
        quote.setPlanName(plan.getName());
        quote.setPlanType(plan.getPlanType());
        quote.setFamilyHeadBilling(familyHeadBilling);
        quote.getLines().add(new FamilyPlanChangeQuoteDTO.Line(head.getId(), head.getName(), null, false,
                "HEAD", ON_HEAD, headLineFee, group ? "Family head" : null));
        BigDecimal ownTotal = BigDecimal.ZERO;
        for (Person p : family) {
            quote.getLines().add(new FamilyPlanChangeQuoteDTO.Line(p.existing != null ? p.existing.getId() : null,
                    p.name, p.relationship, p.minor, p.action, p.billing, p.fee, noteFor(p, familyHeadBilling)));
            if (OWN.equals(p.billing)) ownTotal = ownTotal.add(p.fee);
        }
        for (Member d : detached) {
            String until = d.getExpiryDate() != null ? " until " + DATE.format(d.getExpiryDate()) : "";
            quote.getLines().add(new FamilyPlanChangeQuoteDTO.Line(d.getId(), d.getName(), d.getRelationshipToHead(),
                    Boolean.TRUE.equals(d.getIsMinor()), "DETACH", NONE, BigDecimal.ZERO,
                    "Leaves the family and keeps access" + until + ", then renews on their own"));
        }
        BigDecimal subtotal = headOwnFee.add(billedToHeadFees).add(ownTotal);
        quote.setSubtotal(subtotal);
        quote.setRewardDiscount(rewardDiscount);
        quote.setTotalDue(subtotal.subtract(rewardDiscount).max(BigDecimal.ZERO));
        if (discount.signum() > 0) {
            quote.getNotes().add("Discount of " + discount + " taken off " + head.getName() + "'s fee.");
        }
        if (!detached.isEmpty()) {
            quote.getNotes().add(detached.size() + " member(s) will leave the family. Nothing is refunded; "
                    + "they keep the period already paid for.");
        }
        return new Change(head, plan, group, familyHeadBilling, family, detached,
                headOwnFee, billedToHeadFees, rewardDiscount, quote);
    }

    private static String noteFor(Person p, boolean familyHeadBilling) {
        if (NONE.equals(p.billing)) {
            return LINK.equals(p.action)
                    ? "Joins the family; keeps and renews their own membership"
                    : "Pays for their own membership — renews separately";
        }
        if (OWN.equals(p.billing)) {
            return KEEP.equals(p.action) ? "Moves to their own membership on this plan (own receipt)"
                    : "Own membership on this plan (own receipt)";
        }
        String base = familyHeadBilling ? "On the family invoice" : "Billed to the family head";
        return LINK.equals(p.action) ? base + "; their current plan is replaced and they renew with the family" : base;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Leaves the family as a standalone member: keeps the dates already paid for
     * (agreed policy — nothing refunded or cut short), then renews on their own.
     */
    private void detach(Member m) {
        boolean wasBilledToHead = m.isEffectivelyBilledToHead();
        m.setFamilyHeadId(null);
        m.setRelationshipToHead(null);
        m.setIsFamilyHead(false);
        m.setBilledToHead(false);
        m.setMembershipType("Individual");
        if (wasBilledToHead) {
            // Their share was on the head's invoice — any unpaid part stays the head's.
            m.setOutstandingBalance(BigDecimal.ZERO);
            m.setPaymentStatus("paid");
        }
        memberRepository.save(m);
    }

    private static RenewalRequestDTO renewalFor(MembershipPlan plan, BigDecimal fee, List<PaymentSplitDTO> legs,
                                                FamilyPlanChangeRequestDTO req) {
        RenewalRequestDTO r = new RenewalRequestDTO();
        r.setPlanName(plan.getName());
        r.setMembershipType(plan.getPlanType());
        r.setMembershipStatus("active");
        r.setMembershipFee(fee);
        r.setAmountReceived(MobileFamilyPricingService.sum(legs));
        r.setPaymentMethod(methodOf(legs, req.getPaymentMethod()));
        r.setPaymentBreakdown(legs.size() > 1 ? legs : null);
        if (!legs.isEmpty()) {
            r.setBankAccountCode(req.getBankAccountCode());
            r.setBankAccountName(req.getBankAccountName());
        }
        r.setProcessedByStaffId(req.getProcessedByStaffId());
        return r;
    }

    private static void applyOwnPayment(FamilyMemberDTO fm, MembershipPlan plan, BigDecimal fee,
                                        List<PaymentSplitDTO> legs, FamilyPlanChangeRequestDTO req) {
        BigDecimal paid = MobileFamilyPricingService.sum(legs);
        BigDecimal outstanding = fee.subtract(paid).max(BigDecimal.ZERO);
        fm.setMembershipPlan(plan.getName());
        fm.setMembershipFee(fee);
        fm.setOutstandingBalance(outstanding);
        fm.setPaymentStatus(outstanding.signum() <= 0 ? "paid" : paid.signum() > 0 ? "partial" : "pending");
        fm.setPaymentMethod(paid.signum() > 0 ? methodOf(legs, req.getPaymentMethod()) : "Credit");
        fm.setPaymentBreakdown(legs.size() > 1 ? legs : null);
        if (paid.signum() > 0) {
            fm.setBankAccountCode(req.getBankAccountCode());
            fm.setBankAccountName(req.getBankAccountName());
        }
        fm.setProcessedByStaffId(req.getProcessedByStaffId());
    }

    /** One real method → that method; several → "Mixed"; nothing paid → the requested label. */
    private static String methodOf(List<PaymentSplitDTO> legs, String fallback) {
        Set<String> methods = new LinkedHashSet<>();
        legs.forEach(l -> { if (l.getMethod() != null) methods.add(l.getMethod()); });
        if (methods.size() == 1) return methods.iterator().next();
        if (methods.size() > 1) return "Mixed";
        return fallback;
    }
}
