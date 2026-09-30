package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberFreezeRequestDTO;
import com.company.project.entities.Member;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MembershipFreezeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MobileMemberFreezeService {

    private final MemberRepository memberRepository;
    private final MembershipFreezeService freezeService;

    public MobileMemberFreezeService(MemberRepository memberRepository,
                                     MembershipFreezeService freezeService) {
        this.memberRepository = memberRepository;
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

    public MembershipFreezeService.FreezeResult freezeMembership(MobileMemberFreezeRequestDTO request, UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        int durationDays = request.getDurationDays() != null ? request.getDurationDays() : 0;
        return freezeService.freezeByMember(member, durationDays, request.getReason());
    }

    public void unfreezeMembership(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        if (!"frozen".equalsIgnoreCase(member.getMembershipStatus())) {
            throw new IllegalStateException("Membership is not currently frozen.");
        }

        freezeService.unfreeze(member.getId());
    }
}
