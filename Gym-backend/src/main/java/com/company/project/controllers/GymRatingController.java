package com.company.project.controllers;

import com.company.project.dto.ratings.GymRatingDetailDTO;
import com.company.project.dto.ratings.GymRatingSummaryDTO;
import com.company.project.dto.ratings.GymReviewRequestStatusDTO;
import com.company.project.entities.Branch;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.GymReviewRequestService;
import com.company.project.services.GymReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

/**
 * The gym's own Ratings page: members' ratings of each branch, and asking members to
 * rate one ("Request reviews"). One page per branch — a user working in one branch only
 * ever sees that branch; an owner in "All branches" mode picks one.
 * Member Connect permissions: asking members for reviews is member outreach.
 */
@RestController
@RequestMapping("/api/gym-ratings")
public class GymRatingController {

    private final GymReviewService gymReviewService;
    private final GymReviewRequestService requestService;
    private final BranchRepository branchRepository;
    private final ReviewRepository reviewRepository;

    public GymRatingController(
            GymReviewService gymReviewService,
            GymReviewRequestService requestService,
            BranchRepository branchRepository,
            ReviewRepository reviewRepository) {
        this.gymReviewService = gymReviewService;
        this.requestService = requestService;
        this.branchRepository = branchRepository;
        this.reviewRepository = reviewRepository;
    }

    /** GET /api/gym-ratings/branches — roll-up of every branch the caller can see. */
    @GetMapping("/branches")
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_VIEW')")
    public ResponseEntity<List<GymRatingSummaryDTO>> getBranches() {
        Long active = BranchContextHolder.getActiveBranchId();
        List<Branch> branches = active != null
                ? branchRepository.findById(active).stream().toList()
                : branchRepository.findAll();
        return ResponseEntity.ok(branches.stream()
                .sorted(Comparator.comparing(Branch::getBranchName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(b -> GymReviewService.toSummary(b.getId(), b.getBranchName(),
                        gymReviewService.starCounts(b.getId()), reviewRepository.findLastReviewAt(b.getId())))
                .toList());
    }

    /** GET /api/gym-ratings/branches/{branchId} — summary, every review, and review-request status. */
    @GetMapping("/branches/{branchId}")
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_VIEW')")
    public ResponseEntity<GymRatingDetailDTO> getBranch(@PathVariable Long branchId) {
        requireBranch(branchId);
        GymRatingDetailDTO dto = new GymRatingDetailDTO();
        dto.setSummary(gymReviewService.summary(branchId));
        dto.setReviews(gymReviewService.reviews(branchId));
        dto.setRequest(requestService.status(branchId));
        return ResponseEntity.ok(dto);
    }

    /** POST /api/gym-ratings/branches/{branchId}/request-reviews — notify eligible members (30-day cooldown). */
    @PostMapping("/branches/{branchId}/request-reviews")
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_CREATE')")
    public ResponseEntity<GymReviewRequestStatusDTO> requestReviews(@PathVariable Long branchId) {
        requireBranch(branchId);
        return ResponseEntity.ok(requestService.send(branchId));
    }

    /** Working in one branch limits you to it; "All branches" (owners only) allows any of the gym's branches. */
    private void requireBranch(Long branchId) {
        Long active = BranchContextHolder.getActiveBranchId();
        if (active != null && !active.equals(branchId)) {
            throw new AccessDeniedException("You can only view ratings for your active branch");
        }
        if (!branchRepository.existsById(branchId)) {
            throw new com.company.project.exceptions.EntityNotFoundException("Branch not found");
        }
    }
}
