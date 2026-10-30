package com.company.project.controllers.mobile.discovery;

import com.company.project.dto.ReviewRequestDTO;
import com.company.project.dto.ReviewResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.Review;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.GymReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Member-submitted ratings/reviews for a branch, surfaced in mobile discovery.
 * Read-only browsing needs no auth (same as the rest of /api/mobile/discovery/**);
 * submitting one requires being an authenticated member of that specific branch —
 * mirrors the membership check MobileDiscoveryController.purchaseMembership uses.
 */
@RestController
@RequestMapping("/api/mobile/discovery/centers/{tenantSlug}/{branchId}/reviews")
public class MobileReviewController {

    private final ReviewRepository reviewRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final GymReviewService gymReviewService;

    public MobileReviewController(
            ReviewRepository reviewRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            GymReviewService gymReviewService) {
        this.reviewRepository = reviewRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.gymReviewService = gymReviewService;
    }

    @GetMapping
    public ResponseEntity<List<ReviewResponseDTO>> getReviews(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId) {
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);

            List<ReviewResponseDTO> reviews = reviewRepository.findByBranchIdOrderByCreatedAtDesc(branchId).stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(reviews);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    @PostMapping
    public ResponseEntity<ReviewResponseDTO> submitReview(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId,
            @RequestBody ReviewRequestDTO request) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().build();
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
            return ResponseEntity.status(401).build();
        }
        UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
        // A staff sign-in's id is that gym's users.id — looking it up as a global user id
        // would match whichever member holds that global id.
        Long globalUserId = principal.isGlobal() ? principal.getId() : null;

        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);

            Branch branch = branchRepository.findById(branchId).orElse(null);
            if (branch == null) {
                return ResponseEntity.notFound().build();
            }

            Member member = (principal.isGlobal()
                    ? memberRepository.findByGlobalUserId(principal.getId())
                    : memberRepository.findByUserId(principal.getId())).orElse(null);
            if (member == null || !branchId.equals(member.getBranchId())) {
                // Only an actual member of this branch may leave a review — a
                // review here is proof-of-membership, unlike browsing the listing.
                return ResponseEntity.status(403).build();
            }

            Review review = gymReviewService.save(member, globalUserId,
                    request.getRating(), request.getTags(), request.getComment(), request.isAnonymous());

            return ResponseEntity.ok(toResponse(review));
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    private ReviewResponseDTO toResponse(Review review) {
        ReviewResponseDTO dto = new ReviewResponseDTO();
        dto.setId(review.getId());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setTags(review.getTags());
        dto.setAnonymous(review.isAnonymous());
        dto.setCreatedAt(review.getCreatedAt());
        // Public listing: an anonymous review never carries its author's name.
        if (review.isAnonymous()) {
            dto.setMemberName("Anonymous member");
        } else {
            memberRepository.findById(review.getMemberId()).ifPresent(m -> dto.setMemberName(m.getName()));
        }
        return dto;
    }
}
