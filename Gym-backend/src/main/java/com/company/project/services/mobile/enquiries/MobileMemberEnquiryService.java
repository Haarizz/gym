package com.company.project.services.mobile.enquiries;

import com.company.project.dto.enquiries.MemberEnquiryDTO;
import com.company.project.dto.enquiries.MemberEnquiryRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MemberEnquiry;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberEnquiryRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberEnquiryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/** The member app's enquiries: raise one, and read back their own with the gym's replies. */
@Service
@Transactional(readOnly = true)
public class MobileMemberEnquiryService {

    /** Stops one member flooding the gym's inbox; replied/closed enquiries don't count. */
    public static final int MAX_OPEN_ENQUIRIES = 5;

    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final MemberEnquiryRepository enquiryRepository;

    public MobileMemberEnquiryService(
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            MemberEnquiryRepository enquiryRepository) {
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.enquiryRepository = enquiryRepository;
    }

    public List<MemberEnquiryDTO> list(UserDetailsImpl principal) {
        Member member = requireMember(principal);
        return enquiryRepository.findByMemberIdOrderByCreatedAtDesc(member.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public MemberEnquiryDTO create(UserDetailsImpl principal, MemberEnquiryRequestDTO request) {
        Member member = requireMember(principal);
        String category = request.getCategory() == null || request.getCategory().isBlank()
                ? "GENERAL" : request.getCategory().trim().toUpperCase();
        if (!MemberEnquiry.CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Unknown category");
        }
        String subject = MemberEnquiryService.requireText(request.getSubject(), "Subject", MemberEnquiryService.MAX_SUBJECT_LENGTH);
        String message = MemberEnquiryService.requireText(request.getMessage(), "Message", MemberEnquiryService.MAX_TEXT_LENGTH);
        if (enquiryRepository.countByMemberIdAndStatus(member.getId(), MemberEnquiry.OPEN) >= MAX_OPEN_ENQUIRIES) {
            throw new BusinessRuleViolationException(
                    "You already have " + MAX_OPEN_ENQUIRIES + " open enquiries. Please wait for the gym to reply before raising another.");
        }

        MemberEnquiry enquiry = new MemberEnquiry();
        enquiry.setBranchId(member.getBranchId());
        enquiry.setMemberId(member.getId());
        enquiry.setCategory(category);
        enquiry.setSubject(subject);
        enquiry.setMessage(message);
        return toDto(enquiryRepository.saveAndFlush(enquiry));
    }

    private MemberEnquiryDTO toDto(MemberEnquiry e) {
        MemberEnquiryDTO dto = MemberEnquiryService.baseDto(e);
        dto.setBranchName(branchRepository.findById(e.getBranchId()).map(b -> b.getBranchName()).orElse(null));
        // The member sees "the gym" replied, not which staff account did.
        dto.setRepliedBy(null);
        dto.setClosedBy(null);
        return dto;
    }

    private Member requireMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> member = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (member.isEmpty() && principal.isGlobal()) {
            member = memberRepository.findByUserId(principal.getId());
        }
        Member m = member.orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
        if (m.getBranchId() == null) {
            throw new EntityNotFoundException("Member has no branch");
        }
        return m;
    }
}
