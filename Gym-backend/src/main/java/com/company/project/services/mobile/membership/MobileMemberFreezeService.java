package com.company.project.services.mobile.membership;

import com.company.project.dto.FreezeRequestDTO;
import com.company.project.dto.mobile.membership.MobileMemberFreezeRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@Transactional
public class MobileMemberFreezeService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository membershipPlanRepository;
    private final MemberService memberService;

    public MobileMemberFreezeService(MemberRepository memberRepository,
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

    public void freezeMembership(MobileMemberFreezeRequestDTO request, UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        if (!"active".equalsIgnoreCase(member.getMembershipStatus())) {
            throw new IllegalStateException("Membership must be active to freeze.");
        }

        MembershipPlan plan = null;
        if (member.getMembershipPlan() != null) {
            plan = membershipPlanRepository.findByName(member.getMembershipPlan()).orElse(null);
        }

        if (plan == null || plan.getMaxFreezeDays() == null || plan.getMaxFreezeDays() <= 0) {
            throw new IllegalStateException("Your membership plan does not allow freezing.");
        }

        int durationDays = request.getDurationDays() != null ? request.getDurationDays() : 0;
        if (durationDays <= 0 || durationDays > plan.getMaxFreezeDays()) {
            throw new IllegalArgumentException("Invalid freeze duration. Must be between 1 and " + plan.getMaxFreezeDays() + " days.");
        }

        LocalDateTime freezeUntil = LocalDateTime.now().plusDays(durationDays);

        FreezeRequestDTO coreRequest = new FreezeRequestDTO();
        coreRequest.setFreezeUntil(freezeUntil.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z");
        coreRequest.setReason(request.getReason());

        memberService.freezeMember(member.getId(), coreRequest);
    }

    public void unfreezeMembership(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        if (!"frozen".equalsIgnoreCase(member.getMembershipStatus())) {
            throw new IllegalStateException("Membership is not currently frozen.");
        }

        memberService.unfreezeMember(member.getId());
    }
}
