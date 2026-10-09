package com.company.project.services.mobile.membership;

import com.company.project.dto.RenewalRequestDTO;
import com.company.project.dto.mobile.membership.*;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberService;
import com.company.project.services.MembershipFreezeService;
import com.company.project.services.RewardRedemptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.dto.PaginationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.company.project.services.PlanOfferPricing;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class MobileMemberMembershipChangeService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final MemberService memberService;
    private final RewardRedemptionService rewardRedemptionService;
    private final MembershipFreezeService freezeService;

    public MobileMemberMembershipChangeService(
            MemberRepository memberRepository,
            MembershipPlanRepository membershipPlanRepository,
            MemberService memberService,
            RewardRedemptionService rewardRedemptionService,
            MembershipFreezeService freezeService) {
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.memberService = memberService;
        this.rewardRedemptionService = rewardRedemptionService;
        this.freezeService = freezeService;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        java.util.Optional<Member> memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }
        return memberOpt.orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    private MobileMembershipPlanDTO toMobileDTO(MembershipPlan plan) {
        MobileMembershipPlanDTO dto = new MobileMembershipPlanDTO();
        dto.setId(plan.getId());
        dto.setName(plan.getName());
        dto.setPrice(plan.getPrice());
        dto.setDiscount(PlanOfferPricing.discount(plan));
        dto.setEffectivePrice(PlanOfferPricing.effectivePrice(plan));
        dto.setOfferLabel(PlanOfferPricing.isActive(plan, LocalDate.now()) ? plan.getOfferLabel() : null);
        dto.setDuration(plan.getDuration());
        dto.setPlanType(plan.getPlanType());

        List<String> features = new ArrayList<>();
        if (plan.getDescription() != null && !plan.getDescription().trim().isEmpty()) {
            for (String f : plan.getDescription().split("\n")) {
                if (!f.trim().isEmpty()) features.add(f.trim());
            }
        }
        if ("Unlimited".equalsIgnoreCase(plan.getAttendanceLimit())) {
            features.add("Unlimited gym access");
        } else if (plan.getAttendanceValue() != null) {
            features.add(plan.getAttendanceValue() + " visits per " + plan.getAttendancePeriod());
        }
        if (plan.getMaxSessions() != null && plan.getMaxSessions() > 0) {
            features.add(plan.getMaxSessions() + " Personal Training sessions included");
        }
        dto.setFeatures(features);
        return dto;
    }

    public MobileMembershipPlanPageDTO getPlans(int page, int limit, String search) {
        Pageable pageable = PageRequest.of(page - 1, limit);
        Page<MembershipPlan> planPage;
        
        if (search != null && !search.trim().isEmpty()) {
            planPage = membershipPlanRepository.findByStatusAndNameContainingIgnoreCase("Active", search.trim(), pageable);
        } else {
            planPage = membershipPlanRepository.findByStatus("Active", pageable);
        }

        List<MobileMembershipPlanDTO> plans = planPage.getContent().stream()
                .map(this::toMobileDTO)
                .toList();

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setLimit(limit);
        pagination.setTotal((int) planPage.getTotalElements());
        pagination.setTotalPages(planPage.getTotalPages());

        MobileMembershipPlanPageDTO response = new MobileMembershipPlanPageDTO();
        response.setPlans(plans);
        response.setPagination(pagination);
        
        return response;
    }

    public MembershipChangePreviewResponseDTO previewChange(MembershipChangePreviewRequestDTO request, UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        MembershipPlan plan = membershipPlanRepository.findById(request.getPlanId())
                .orElseThrow(() -> new EntityNotFoundException("Membership Plan not found"));

        if (!"Active".equalsIgnoreCase(plan.getStatus())) {
            throw new BusinessRuleViolationException("Selected plan is not available");
        }
        rejectFamilyPlan(member, plan);

        MobileMembershipPlanDTO planDTO = toMobileDTO(plan);
        MembershipChangePreviewResponseDTO response = new MembershipChangePreviewResponseDTO();
        response.setSelectedPlan(planDTO);
        response.setFeatures(planDTO.getFeatures());

        BigDecimal currentPrice = BigDecimal.ZERO;
        if (member.getMembershipPlan() != null) {
            Optional<MembershipPlan> currentPlanOpt = membershipPlanRepository.findByName(member.getMembershipPlan());
            if (currentPlanOpt.isPresent()) {
                currentPrice = currentPlanOpt.get().getPrice() != null ? currentPlanOpt.get().getPrice() : BigDecimal.ZERO;
            }
        }

        BigDecimal newPrice = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;
        
        String operation;
        if (member.getMembershipPlan() != null && member.getMembershipPlan().equals(plan.getName())) {
            operation = "RENEWAL";
        } else if (newPrice.compareTo(currentPrice) > 0) {
            operation = "UPGRADE";
        } else {
            operation = "DOWNGRADE";
        }
        response.setOperation(operation);

        BigDecimal regularAmount = newPrice;
        // The plan's running offer, if any; everyone gets it without a code.
        BigDecimal discountAmount = PlanOfferPricing.discount(plan);
        BigDecimal finalAmount = PlanOfferPricing.effectivePrice(plan);

        // A picked Reward Pass / coupon comes off the plan's offer price —
        // previewed only here; changePlan() spends it.
        BigDecimal rewardDiscount = previewRewardDiscount(member, request.getRewardPassId(), request.getCouponCode(), finalAmount);

        response.setRegularAmount(regularAmount);
        response.setDiscountAmount(discountAmount);
        response.setOfferLabel(discountAmount.signum() > 0 ? plan.getOfferLabel() : null);
        response.setRewardDiscountAmount(rewardDiscount);
        response.setFinalAmount(finalAmount.subtract(rewardDiscount));

        return response;
    }

    @Transactional
    public void changePlan(MembershipChangeRequestDTO request, UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        MembershipPlan plan = membershipPlanRepository.findById(request.getPlanId())
                .orElseThrow(() -> new EntityNotFoundException("Membership Plan not found"));

        if (!"Active".equalsIgnoreCase(plan.getStatus())) {
            throw new BusinessRuleViolationException("Selected plan is not available");
        }
        rejectFamilyPlan(member, plan);

        BigDecimal finalAmount = PlanOfferPricing.effectivePrice(plan);

        RenewalRequestDTO renewalRequest = new RenewalRequestDTO();
        renewalRequest.setPlanName(plan.getName());
        renewalRequest.setMembershipFee(finalAmount);
        renewalRequest.setOfferDiscount(PlanOfferPricing.discount(plan));
        renewalRequest.setOfferLabel(PlanOfferPricing.receiptLabel(plan.getOfferLabel()));
        renewalRequest.setAmountReceived(finalAmount);
        renewalRequest.setPaymentMethod(request.getPaymentMethodUsed());
        renewalRequest.setPaymentBreakdown(request.getPaymentBreakdown());
        // renewMember treats membershipFee as the pre-reward fee, takes the pass/coupon
        // discount off it and caps amountReceived at the net fee.
        renewalRequest.setRewardPassId(request.getRewardPassId());
        renewalRequest.setCouponCode(request.getCouponCode());

        freezeService.renewEndingFreeze(member.getId(), renewalRequest);
    }

    /**
     * Switching onto a Family/Couple plan also registers the family members, so it
     * goes through /api/mobile/family/convert — renewing into one here would leave
     * a family plan with nobody on it. Renewing the Family/Couple plan they're
     * already on is still a plain renewal.
     */
    private void rejectFamilyPlan(Member member, MembershipPlan plan) {
        boolean familyPlan = "Family".equalsIgnoreCase(plan.getPlanType())
                || "Couple".equalsIgnoreCase(plan.getPlanType());
        if (familyPlan && !plan.getName().equals(member.getMembershipPlan())) {
            throw new BusinessRuleViolationException("Switching to a " + plan.getPlanType()
                    + " plan needs your family members — use the family membership screen.");
        }
    }

    private BigDecimal previewRewardDiscount(Member member, Long rewardPassId, String couponCode, BigDecimal gross) {
        boolean hasCoupon = couponCode != null && !couponCode.isBlank();
        if (rewardPassId != null && hasCoupon) {
            throw new BusinessRuleViolationException("Apply either a Reward Pass or a coupon code, not both");
        }
        if (rewardPassId != null) {
            return rewardRedemptionService.previewPassDiscount(rewardPassId, member.getMemberId(), PassContext.MEMBERSHIP, gross);
        }
        if (hasCoupon) {
            return rewardRedemptionService.previewCouponDiscount(couponCode, gross);
        }
        return BigDecimal.ZERO;
    }
}
