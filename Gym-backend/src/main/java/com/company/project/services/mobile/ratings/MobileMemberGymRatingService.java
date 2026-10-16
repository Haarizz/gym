package com.company.project.services.mobile.ratings;

import com.company.project.dto.ReviewRequestDTO;
import com.company.project.dto.mobile.ratings.MemberGymRatingDTO;
import com.company.project.entities.GymReviewRequestRecipient;
import com.company.project.entities.Member;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymReviewRequestRecipientRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.GymReviewService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** The member app's gym rating: their branch, their review of it, and the review-request prompt. */
@Service
@Transactional(readOnly = true)
public class MobileMemberGymRatingService {

    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final ReviewRepository reviewRepository;
    private final GymReviewRequestRecipientRepository recipientRepository;
    private final GymReviewService gymReviewService;

    public MobileMemberGymRatingService(
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            ReviewRepository reviewRepository,
            GymReviewRequestRecipientRepository recipientRepository,
            GymReviewService gymReviewService) {
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.reviewRepository = reviewRepository;
        this.recipientRepository = recipientRepository;
        this.gymReviewService = gymReviewService;
    }

    public MemberGymRatingDTO get(UserDetailsImpl principal) {
        return toDto(requireMember(principal));
    }

    @Transactional
    public MemberGymRatingDTO rate(UserDetailsImpl principal, ReviewRequestDTO request) {
        Member member = requireMember(principal);
        gymReviewService.save(member, principal.isGlobal() ? principal.getId() : null,
                request.getRating(), request.getTags(), request.getComment(), request.isAnonymous());
        return toDto(member);
    }

    /** The member closed the rate sheet: stop opening it on launch. The notification still opens it. */
    @Transactional
    public MemberGymRatingDTO dismissPrompt(UserDetailsImpl principal) {
        Member member = requireMember(principal);
        for (GymReviewRequestRecipient r : recipientRepository.findByMemberIdAndStatus(member.getId(), GymReviewRequestRecipient.PENDING)) {
            r.setStatus(GymReviewRequestRecipient.DISMISSED);
        }
        return toDto(member);
    }

    private MemberGymRatingDTO toDto(Member member) {
        MemberGymRatingDTO dto = new MemberGymRatingDTO();
        dto.setBranchId(member.getBranchId());
        dto.setBranchName(branchRepository.findById(member.getBranchId()).map(b -> b.getBranchName()).orElse(null));
        dto.setPendingRequest(!recipientRepository.findByMemberIdAndStatus(member.getId(), GymReviewRequestRecipient.PENDING).isEmpty());
        reviewRepository.findByBranchIdAndMemberId(member.getBranchId(), member.getId()).ifPresent(r -> {
            MemberGymRatingDTO.MyReview mine = new MemberGymRatingDTO.MyReview();
            mine.setRating(r.getRating());
            mine.setTags(r.getTags());
            mine.setComment(r.getComment());
            mine.setAnonymous(r.isAnonymous());
            mine.setUpdatedAt(r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt());
            dto.setMyReview(mine);
        });
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
