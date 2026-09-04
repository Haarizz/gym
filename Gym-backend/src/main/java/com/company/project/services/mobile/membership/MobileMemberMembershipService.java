package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberMembershipResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MobileMemberMembershipService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;

    public MobileMemberMembershipService(
            MemberRepository memberRepository,
            MembershipPlanRepository membershipPlanRepository) {
        this.memberRepository = memberRepository;
        this.membershipPlanRepository = membershipPlanRepository;
    }

    private java.util.Optional<Member> getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId());
    }

    public MobileMemberMembershipResponseDTO getMembership(UserDetailsImpl principal) {
        java.util.Optional<Member> memberOpt = getAuthenticatedMember(principal);
        MobileMemberMembershipResponseDTO response = new MobileMemberMembershipResponseDTO();
        
        if (memberOpt.isEmpty()) {
            MobileMemberMembershipResponseDTO.MembershipInfo inactiveInfo = new MobileMemberMembershipResponseDTO.MembershipInfo();
            inactiveInfo.setStatus("No Active Plan");
            inactiveInfo.setAutoRenew(false);
            response.setMembership(inactiveInfo);
            
            MobileMemberMembershipResponseDTO.FreezeInfo noFreeze = new MobileMemberMembershipResponseDTO.FreezeInfo();
            noFreeze.setAvailable(false);
            noFreeze.setIsFrozen(false);
            response.setFreeze(noFreeze);
            
            MobileMemberMembershipResponseDTO.RenewalOfferInfo noOffer = new MobileMemberMembershipResponseDTO.RenewalOfferInfo();
            noOffer.setAvailable(false);
            response.setRenewalOffer(noOffer);
            
            response.setBenefits(java.util.Collections.emptyList());
            return response;
        }

        Member member = memberOpt.get();
        
        // 1. Membership Overview
        MobileMemberMembershipResponseDTO.MembershipInfo membershipInfo = new MobileMemberMembershipResponseDTO.MembershipInfo();
        membershipInfo.setId(member.getId());
        membershipInfo.setStatus(member.getMembershipStatus());
        membershipInfo.setStartDate(member.getMembershipStartDate());
        membershipInfo.setExpiryDate(member.getExpiryDate());
        
        // Determine plan details
        MembershipPlan plan = null;
        if (member.getMembershipPlan() != null) {
            plan = membershipPlanRepository.findByName(member.getMembershipPlan()).orElse(null);
        }

        if (plan != null) {
            MobileMemberMembershipResponseDTO.PlanInfo planInfo = new MobileMemberMembershipResponseDTO.PlanInfo();
            planInfo.setId(plan.getId());
            planInfo.setName(plan.getName());
            planInfo.setPrice(plan.getPrice());
            planInfo.setDuration(plan.getDuration());
            membershipInfo.setPlan(planInfo);
        }
        
        // Calculate days
        if (member.getMembershipStartDate() != null && member.getExpiryDate() != null) {
            int totalDays = (int) ChronoUnit.DAYS.between(
                    member.getMembershipStartDate().toLocalDate(), 
                    member.getExpiryDate().toLocalDate());
            membershipInfo.setTotalDays(Math.max(0, totalDays));
        }

        if (member.getExpiryDate() != null) {
            int remainingDays = (int) ChronoUnit.DAYS.between(
                    LocalDate.now(), 
                    member.getExpiryDate().toLocalDate());
            membershipInfo.setRemainingDays(Math.max(0, remainingDays));
        }

        // Auto-renew: no explicit field on member, defaulting to false
        membershipInfo.setAutoRenew(false);
        
        response.setMembership(membershipInfo);

        // 2. Benefits
        List<MobileMemberMembershipResponseDTO.BenefitInfo> benefits = new ArrayList<>();
        if (plan != null) {
            if (plan.getDescription() != null && !plan.getDescription().trim().isEmpty()) {
                MobileMemberMembershipResponseDTO.BenefitInfo descBenefit = new MobileMemberMembershipResponseDTO.BenefitInfo();
                descBenefit.setId("desc");
                descBenefit.setName("Plan Details");
                descBenefit.setDescription(plan.getDescription());
                benefits.add(descBenefit);
            }
            if ("Unlimited".equalsIgnoreCase(plan.getAttendanceLimit())) {
                MobileMemberMembershipResponseDTO.BenefitInfo attendance = new MobileMemberMembershipResponseDTO.BenefitInfo();
                attendance.setId("attendance");
                attendance.setName("Unlimited Access");
                attendance.setDescription("Train as many times as you like.");
                benefits.add(attendance);
            } else if (plan.getAttendanceValue() != null) {
                MobileMemberMembershipResponseDTO.BenefitInfo attendance = new MobileMemberMembershipResponseDTO.BenefitInfo();
                attendance.setId("attendance");
                attendance.setName("Limited Access");
                attendance.setDescription(plan.getAttendanceValue() + " visits per " + plan.getAttendancePeriod() + ".");
                benefits.add(attendance);
            }
            if (plan.getMaxSessions() != null && plan.getMaxSessions() > 0) {
                MobileMemberMembershipResponseDTO.BenefitInfo sessions = new MobileMemberMembershipResponseDTO.BenefitInfo();
                sessions.setId("sessions");
                sessions.setName("Personal Training");
                sessions.setDescription(plan.getMaxSessions() + " sessions included.");
                benefits.add(sessions);
            }
        }
        response.setBenefits(benefits);

        // 3. Freeze Information
        MobileMemberMembershipResponseDTO.FreezeInfo freezeInfo = new MobileMemberMembershipResponseDTO.FreezeInfo();
        if (plan != null && plan.getMaxFreezeDays() != null && plan.getMaxFreezeDays() > 0) {
            freezeInfo.setAvailable(true);
            freezeInfo.setAllowedDays(plan.getMaxFreezeDays());
        } else {
            freezeInfo.setAvailable(false);
            freezeInfo.setAllowedDays(0);
        }
        
        boolean isFrozen = "frozen".equalsIgnoreCase(member.getMembershipStatus());
        freezeInfo.setIsFrozen(isFrozen);
        if (isFrozen) {
            if (member.getFreezeStartDate() != null) {
                freezeInfo.setStartDate(member.getFreezeStartDate().toString());
            }
            if (member.getFreezeEndDate() != null) {
                freezeInfo.setEndDate(member.getFreezeEndDate().toString());
            }
        }
        response.setFreeze(freezeInfo);

        // 4. Renewal Offer - Existing backend promotions are global/voucher based, no explicit per-member renewal offer
        MobileMemberMembershipResponseDTO.RenewalOfferInfo offerInfo = new MobileMemberMembershipResponseDTO.RenewalOfferInfo();
        offerInfo.setAvailable(false);
        response.setRenewalOffer(offerInfo);

        return response;
    }
}
