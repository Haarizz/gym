package com.company.project.services.mobile.membership;

import com.company.project.dto.RenewalRequestDTO;
import com.company.project.dto.mobile.membership.*;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.dto.PaginationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class MobileMemberMembershipChangeService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final MemberService memberService;

    public MobileMemberMembershipChangeService(
            MemberRepository memberRepository,
            MembershipPlanRepository membershipPlanRepository,
            MemberService memberService) {
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
        this.memberService = memberService;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    private MobileMembershipPlanDTO toMobileDTO(MembershipPlan plan) {
        MobileMembershipPlanDTO dto = new MobileMembershipPlanDTO();
        dto.setId(plan.getId());
        dto.setName(plan.getName());
        dto.setPrice(plan.getPrice());
        dto.setDiscount(plan.getDiscount() != null ? plan.getDiscount() : BigDecimal.ZERO);
        dto.setDuration(plan.getDuration());

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
        BigDecimal discountAmount = plan.getDiscount() != null ? plan.getDiscount() : BigDecimal.ZERO;
        BigDecimal finalAmount = regularAmount.subtract(discountAmount).max(BigDecimal.ZERO);

        response.setRegularAmount(regularAmount);
        response.setDiscountAmount(discountAmount);
        response.setFinalAmount(finalAmount);

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

        BigDecimal regularAmount = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;
        BigDecimal discountAmount = plan.getDiscount() != null ? plan.getDiscount() : BigDecimal.ZERO;
        BigDecimal finalAmount = regularAmount.subtract(discountAmount).max(BigDecimal.ZERO);

        RenewalRequestDTO renewalRequest = new RenewalRequestDTO();
        renewalRequest.setPlanName(plan.getName());
        renewalRequest.setMembershipFee(finalAmount);
        renewalRequest.setAmountReceived(finalAmount);
        renewalRequest.setPaymentMethod(request.getPaymentMethodUsed());
        renewalRequest.setPaymentBreakdown(request.getPaymentBreakdown());
        
        memberService.renewMember(member.getId(), renewalRequest);
    }
}
