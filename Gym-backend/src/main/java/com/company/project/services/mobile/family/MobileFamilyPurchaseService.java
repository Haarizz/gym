package com.company.project.services.mobile.family;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MinorChargeDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.dto.mobile.discovery.MobilePurchaseRequestDTO;
import com.company.project.dto.mobile.family.MobileFamilyConnectedMemberDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.services.MemberService;
import com.company.project.services.MembershipFreezeService;
import com.company.project.services.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Mobile self-service Family/Couple purchase: the buyer becomes the family head,
 * every connected member is created through the same MemberService.createMember
 * path the web app's add-member form uses, and each connected member with an
 * email gets an invitation they claim by logging in with that email.
 *
 * Expects TenantContextHolder/BranchContextHolder to be set to the target gym
 * (see MobileFamilyPurchaseController).
 */
@Service
public class MobileFamilyPurchaseService {

    private static final Set<String> APPROVAL_REQUIRED_METHODS = Set.of("cash", "credit", "mixed");

    private final MobileIdempotencyService idempotencyService;
    private final MobileFamilyPricingService pricingService;
    private final MobileFamilyInvitationService invitationService;
    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;
    private final MembershipFreezeService freezeService;
    private final ObjectMapper objectMapper;

    public MobileFamilyPurchaseService(MobileIdempotencyService idempotencyService,
                                       MobileFamilyPricingService pricingService,
                                       MobileFamilyInvitationService invitationService,
                                       MemberService memberService,
                                       MemberRepository memberRepository,
                                       NotificationService notificationService,
                                       MembershipFreezeService freezeService,
                                       ObjectMapper objectMapper) {
        this.idempotencyService = idempotencyService;
        this.pricingService = pricingService;
        this.invitationService = invitationService;
        this.memberService = memberService;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
        this.freezeService = freezeService;
        this.objectMapper = objectMapper;
    }

    /** Invitation email to send once the purchase transaction has committed. */
    public record InvitationEmail(String email, String name, String inviterName, String planName) {}

    /** responseJson is what the client gets (cached for replays); emails is empty on a replay. */
    public record PurchaseOutcome(String responseJson, List<InvitationEmail> emails) {}

    @Transactional
    public PurchaseOutcome purchase(UUID idempotencyKey, String payloadFingerprint, MobilePurchaseRequestDTO request,
                                    Long globalUserId, String callerEmail, UserProfile profile,
                                    String tenantSlug, String gymName) {
        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(idempotencyKey, payloadFingerprint);
        if ("COMPLETED".equals(lease.getStatus())) {
            return new PurchaseOutcome(lease.getResponsePayload(), List.of());
        }

        try {
            PurchaseOutcome outcome = doPurchase(request, globalUserId, callerEmail, profile, tenantSlug, gymName);
            // Surface constraint violations (e.g. the unique global_user_id index)
            // here, inside the try, rather than at commit after we've returned.
            memberRepository.flush();
            idempotencyService.completeRequest(idempotencyKey, lease.getLeaseId(), outcome.responseJson());
            return outcome;
        } catch (RuntimeException e) {
            idempotencyService.failRequest(idempotencyKey, lease.getLeaseId());
            throw e;
        }
    }

    private PurchaseOutcome doPurchase(MobilePurchaseRequestDTO request, Long globalUserId, String callerEmail,
                                       UserProfile profile, String tenantSlug, String gymName) {
        MembershipPlan plan = pricingService.resolveFamilyPlan(request.getPlanId());
        List<MobileFamilyConnectedMemberDTO> connected = request.getConnectedMembers();
        if (connected == null || connected.isEmpty()) {
            throw new IllegalArgumentException("Add at least one family member.");
        }

        String buyerEmail = MobileFamilyInvitationService.normalizeEmail(callerEmail);
        if (memberRepository.existsByGlobalUserId(globalUserId)
                || (StringUtils.hasText(buyerEmail) && memberRepository.existsByEmailIgnoreCase(buyerEmail))) {
            throw new BusinessRuleViolationException("You already have a membership at this gym.");
        }
        validateConnectedEmails(connected, buyerEmail);

        String paymentMethodUsed = request.getPaymentMethodUsed();
        boolean requiresApproval = paymentMethodUsed != null
                && APPROVAL_REQUIRED_METHODS.contains(paymentMethodUsed.trim().toLowerCase());
        FamilyBill bill = billFamily(request, plan, connected);
        MobileFamilyPricingService.Quote quote = bill.quote();

        MemberRequestDTO head = buildHeadRequest(request, profile, callerEmail, plan, quote.getHeadFee(),
                bill.headLegs(), requiresApproval);
        head.setIsFamilyHead(true);
        head.setFamilyMembers(bill.familyMembers());

        MemberResponseDTO created = memberService.createMember(head);
        Long headDbId = Long.valueOf(created.getId());
        memberService.linkGlobalUser(headDbId, globalUserId);

        if (requiresApproval) {
            memberService.setAppAccessEnabled(headDbId, false);
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                    "Payment awaiting approval",
                    created.getName() + " paid via " + paymentMethodUsed + " for " + created.getMembershipPlan()
                            + " (" + plan.getPlanType() + ", " + (connected.size() + 1) + " members) — needs reception approval.",
                    "WARNING", "HIGH", "MEMBERS",
                    headDbId, "/approvals",
                    "PAYMENT_PENDING_" + created.getId()
            );
        }

        return inviteAndRespond(memberRepository.findById(headDbId).orElseThrow(), plan, bill,
                tenantSlug, gymName, requiresApproval);
    }

    /**
     * An existing member here switching onto a Family/Couple plan: they become the
     * family head (MemberService.convertToFamilyHead) and their family members are
     * created and invited exactly as on a new purchase, priced by the same quote.
     * No reception-approval gate — same as any other mobile plan change.
     */
    @Transactional
    public PurchaseOutcome convert(UUID idempotencyKey, String payloadFingerprint, MobilePurchaseRequestDTO request,
                                   Long headDbId, String tenantSlug, String gymName) {
        MobileIdempotencyRecord lease = idempotencyService.acquireOrRenewLease(idempotencyKey, payloadFingerprint);
        if ("COMPLETED".equals(lease.getStatus())) {
            return new PurchaseOutcome(lease.getResponsePayload(), List.of());
        }

        try {
            PurchaseOutcome outcome = doConvert(request, headDbId, tenantSlug, gymName);
            memberRepository.flush();
            idempotencyService.completeRequest(idempotencyKey, lease.getLeaseId(), outcome.responseJson());
            return outcome;
        } catch (RuntimeException e) {
            idempotencyService.failRequest(idempotencyKey, lease.getLeaseId());
            throw e;
        }
    }

    private PurchaseOutcome doConvert(MobilePurchaseRequestDTO request, Long headDbId, String tenantSlug, String gymName) {
        MembershipPlan plan = pricingService.resolveFamilyPlan(request.getPlanId());
        List<MobileFamilyConnectedMemberDTO> connected = request.getConnectedMembers();
        if (connected == null || connected.isEmpty()) {
            throw new IllegalArgumentException("Add at least one family member.");
        }
        Member head = memberRepository.findById(headDbId).orElseThrow();
        validateConnectedEmails(connected, MobileFamilyInvitationService.normalizeEmail(head.getEmail()));

        FamilyBill bill = billFamily(request, plan, connected);
        MobileFamilyPricingService.Quote quote = bill.quote();

        // The head's renewal receipt covers their own fee plus everyone billed to
        // them, itemized — the same invoice createMember builds for a new family.
        List<PaymentSplitDTO> headLegs = new ArrayList<>(bill.headLegs());
        BigDecimal billedToHeadFees = BigDecimal.ZERO;
        List<MinorChargeDTO> charges = new ArrayList<>();
        boolean familyPaidInFull = MobileFamilyPricingService.sum(bill.paidLegs()).compareTo(quote.getTotal()) >= 0;
        for (int i = 0; i < connected.size(); i++) {
            FamilyMemberDTO fm = bill.familyMembers().get(i);
            BigDecimal fee = quote.getMemberFees().get(i);
            if (quote.isFamilyHeadBilling()) {
                fm.setMinorFee(fee); // their informational share of the head's invoice
                charges.add(new MinorChargeDTO(null, null, fm.getName(), fee, familyPaidInFull));
            } else if (Boolean.TRUE.equals(fm.getIsMinor())) {
                BigDecimal paid = fm.getMinorPaidAmount() != null ? fm.getMinorPaidAmount() : BigDecimal.ZERO;
                if (fm.getMinorPaymentBreakdown() != null) headLegs.addAll(fm.getMinorPaymentBreakdown());
                billedToHeadFees = billedToHeadFees.add(fee);
                charges.add(new MinorChargeDTO(null, null, fm.getName(), fee,
                        fee.signum() > 0 && paid.compareTo(fee) >= 0));
            }
        }

        RenewalRequestDTO renewal = new RenewalRequestDTO();
        renewal.setMembershipFee(quote.getHeadFee());
        renewal.setBilledToHeadFeeTotal(billedToHeadFees);
        renewal.setMinorCharges(charges);
        renewal.setAmountReceived(MobileFamilyPricingService.sum(headLegs));
        renewal.setPaymentMethod(request.getPaymentMethodUsed());
        renewal.setPaymentBreakdown(headLegs.isEmpty() ? null : headLegs);
        renewal.setBankAccountCode(request.getBankAccountCode());
        renewal.setBankAccountName(request.getBankAccountName());
        // Unfreeze first: the family members copy the head's status, and a plan
        // just paid for shouldn't start out frozen.
        freezeService.endFreezeForRenewal(headDbId);
        memberService.convertToFamilyHead(headDbId, plan, renewal, bill.familyMembers());

        return inviteAndRespond(head, plan, bill, tenantSlug, gymName, false);
    }

    /** What a family costs and how the payment is split across its receipts. */
    private record FamilyBill(MobileFamilyPricingService.Quote quote, List<PaymentSplitDTO> paidLegs,
                              List<PaymentSplitDTO> headLegs, List<FamilyMemberDTO> familyMembers) {}

    private FamilyBill billFamily(MobilePurchaseRequestDTO request, MembershipPlan plan,
                                  List<MobileFamilyConnectedMemberDTO> connected) {
        List<Boolean> minorFlags = connected.stream().map(c -> Boolean.TRUE.equals(c.getIsMinor())).toList();
        List<Long> memberPlanIds = connected.stream().map(MobileFamilyConnectedMemberDTO::getMembershipPlanId).toList();
        MobileFamilyPricingService.Quote quote = pricingService.quote(plan, minorFlags, memberPlanIds);

        String paymentMethodUsed = request.getPaymentMethodUsed();
        List<PaymentSplitDTO> paidLegs = pricingService.paidLegs(request.getPaymentBreakdown(), paymentMethodUsed,
                request.getPaidAmount(), quote.getTotal());

        // Receipts are funded in order: head's own invoice, then (individual billing)
        // minors folded onto it, then each adult's own receipt.
        List<Integer> minorIdx = new ArrayList<>();
        List<Integer> adultIdx = new ArrayList<>();
        for (int i = 0; i < connected.size(); i++) {
            (minorFlags.get(i) ? minorIdx : adultIdx).add(i);
        }
        List<BigDecimal> bucketFees = new ArrayList<>();
        bucketFees.add(quote.getHeadFee());
        if (!quote.isFamilyHeadBilling()) {
            minorIdx.forEach(i -> bucketFees.add(quote.getMemberFees().get(i)));
            adultIdx.forEach(i -> bucketFees.add(quote.getMemberFees().get(i)));
        }
        List<List<PaymentSplitDTO>> allocation = pricingService.allocate(paidLegs, bucketFees);

        FamilyMemberDTO[] familyMembers = new FamilyMemberDTO[connected.size()];
        for (int i = 0; i < connected.size(); i++) {
            familyMembers[i] = baseFamilyMember(connected.get(i));
        }
        if (!quote.isFamilyHeadBilling()) {
            int bucket = 1;
            for (int i : minorIdx) {
                applyMinorPayment(familyMembers[i], quote.getMemberFees().get(i), allocation.get(bucket++), paymentMethodUsed);
            }
            for (int i : adultIdx) {
                applyAdultPayment(familyMembers[i], quote.getMemberPlanNames().get(i), quote.getMemberFees().get(i),
                        allocation.get(bucket++), paymentMethodUsed);
            }
        }
        return new FamilyBill(quote, paidLegs, allocation.get(0), List.of(familyMembers));
    }

    private PurchaseOutcome inviteAndRespond(Member headEntity, MembershipPlan plan, FamilyBill bill,
                                             String tenantSlug, String gymName, boolean approvalPending) {
        List<InvitationEmail> emails = new ArrayList<>();
        List<String> invited = new ArrayList<>();
        for (Member dep : memberRepository.findByFamilyHeadId(headEntity.getMemberId())) {
            if (!StringUtils.hasText(dep.getEmail())) continue;
            invitationService.createInvitation(headEntity, dep, tenantSlug, gymName, plan.getName());
            emails.add(new InvitationEmail(dep.getEmail(), dep.getName(), headEntity.getName(), plan.getName()));
            invited.add(dep.getEmail());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("memberId", headEntity.getMemberId());
        response.put("tenantSlug", tenantSlug);
        response.put("approvalPending", approvalPending);
        response.put("totalAmount", bill.quote().getTotal());
        response.put("paidAmount", MobileFamilyPricingService.sum(bill.paidLegs()));
        response.put("invitedEmails", invited);
        return new PurchaseOutcome(toJson(response), emails);
    }

    private void validateConnectedEmails(List<MobileFamilyConnectedMemberDTO> connected, String buyerEmail) {
        Set<String> seen = new HashSet<>();
        for (MobileFamilyConnectedMemberDTO c : connected) {
            String email = MobileFamilyInvitationService.normalizeEmail(c.getEmail());
            // Every family member becomes a Member row, whose email is NOT NULL —
            // reject here with a clear message rather than at the DB constraint.
            if (!StringUtils.hasText(email)) {
                throw new IllegalArgumentException("Enter an email for " + c.getName() + ".");
            }
            if (email.equals(buyerEmail)) {
                throw new IllegalArgumentException("Use a different email for " + c.getName() + " — that one is yours.");
            }
            if (!seen.add(email)) {
                throw new IllegalArgumentException("Each family member needs a different email (" + email + " is used twice).");
            }
            // Their own membership here would stay the one they use (see claim), so
            // don't charge the buyer for a seat that would never be taken.
            if (memberRepository.existsByEmailIgnoreCase(email)) {
                throw new BusinessRuleViolationException(email + " already has a membership at this gym. "
                        + "Remove " + c.getName() + " or use a different email.");
            }
        }
    }

    private MemberRequestDTO buildHeadRequest(MobilePurchaseRequestDTO request, UserProfile profile, String callerEmail,
                                              MembershipPlan plan, BigDecimal headFee, List<PaymentSplitDTO> headLegs,
                                              boolean requiresApproval) {
        MemberRequestDTO m = new MemberRequestDTO();
        m.setName(profile.getFullName());
        m.setEmail(callerEmail);
        m.setPhone(profile.getPhone());
        m.setGender(profile.getGender());
        if (profile.getDateOfBirth() != null) m.setDateOfBirth(profile.getDateOfBirth().toString());
        m.setBloodType(profile.getBloodType());
        m.setAddress(profile.getAddress());
        m.setHeight(profile.getHeight());
        m.setWeight(profile.getWeight());
        m.setPhotoUrl(profile.getPhotoUrl()); // BG_82: registration photo → gym's Member Directory

        m.setMembershipPlanId(plan.getId());
        m.setMembershipType(plan.getPlanType());
        // Same reception-approval gate as the individual purchase (MobileDiscoveryController).
        m.setMembershipStatus(requiresApproval ? "pending_approval" : "Active");
        if (requiresApproval) m.setApprovalStatus("PENDING");

        String method = request.getPaymentMethodUsed();
        if (method != null) m.setPaymentMethodUsed(method);
        if (request.getBankAccountCode() != null) m.setBankAccountCode(request.getBankAccountCode());
        if (request.getBankAccountName() != null) m.setBankAccountName(request.getBankAccountName());
        if (request.getPaymentDueDate() != null) m.setNextPaymentDate(request.getPaymentDueDate());
        if (!headLegs.isEmpty()) m.setPaymentBreakdown(headLegs);

        BigDecimal paid = MobileFamilyPricingService.sum(headLegs);
        BigDecimal outstanding = headFee.subtract(paid).max(BigDecimal.ZERO);
        m.setMembershipFee(headFee);
        m.setOutstandingBalance(outstanding);
        m.setPaymentStatus(paymentStatus(outstanding, paid));

        String todayIso = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        m.setJoinDate(todayIso);
        m.setMembershipStartDate(todayIso);
        return m;
    }

    private static FamilyMemberDTO baseFamilyMember(MobileFamilyConnectedMemberDTO c) {
        FamilyMemberDTO fm = new FamilyMemberDTO();
        fm.setName(c.getName());
        fm.setEmail(StringUtils.hasText(c.getEmail()) ? c.getEmail().trim() : null);
        fm.setPhone(StringUtils.hasText(c.getPhone()) ? c.getPhone().trim() : null);
        fm.setDateOfBirth(StringUtils.hasText(c.getDateOfBirth()) ? c.getDateOfBirth() : null);
        fm.setRelationship(c.getRelationship());
        fm.setIsMinor(Boolean.TRUE.equals(c.getIsMinor()));
        return fm;
    }

    private static void applyMinorPayment(FamilyMemberDTO fm, BigDecimal fee, List<PaymentSplitDTO> legs, String method) {
        BigDecimal paid = MobileFamilyPricingService.sum(legs);
        fm.setMinorFee(fee);
        fm.setMinorPaidAmount(paid);
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            fm.setMinorPaymentMethod(method);
            fm.setMinorPaymentBreakdown(legs);
        }
    }

    private static void applyAdultPayment(FamilyMemberDTO fm, String planName, BigDecimal fee,
                                          List<PaymentSplitDTO> legs, String method) {
        BigDecimal paid = MobileFamilyPricingService.sum(legs);
        BigDecimal outstanding = fee.subtract(paid).max(BigDecimal.ZERO);
        fm.setMembershipPlan(planName);
        fm.setMembershipFee(fee);
        fm.setOutstandingBalance(outstanding);
        fm.setPaymentStatus(paymentStatus(outstanding, paid));
        fm.setPaymentMethod(method);
        if (!legs.isEmpty()) fm.setPaymentBreakdown(legs);
    }

    private static String paymentStatus(BigDecimal outstanding, BigDecimal paid) {
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) return "paid";
        return paid.compareTo(BigDecimal.ZERO) > 0 ? "partial" : "pending";
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize purchase response", e);
        }
    }
}
