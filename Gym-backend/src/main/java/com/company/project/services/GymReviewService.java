package com.company.project.services;

import com.company.project.controlplane.entities.BranchRatingSummary;
import com.company.project.controlplane.repositories.BranchRatingSummaryRepository;
import com.company.project.dto.ratings.GymRatingSummaryDTO;
import com.company.project.dto.ratings.GymReviewDTO;
import com.company.project.entities.GymReviewRequestRecipient;
import com.company.project.entities.Member;
import com.company.project.entities.Review;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymReviewRequestRecipientRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Member ratings of their gym (branch): saving one, and reading a branch's roll-up and
 * reviews. One review per member per branch — rating again replaces it. Every save also
 * refreshes the branch's row in the control plane's branch_rating_summaries, which the
 * platform admin's Ratings list reads.
 */
@Service
public class GymReviewService {

    private static final Logger log = LoggerFactory.getLogger(GymReviewService.class);

    public static final int MAX_COMMENT_LENGTH = 300;

    /** "What stood out" keys the app offers. The app translates them; the web shows English labels. */
    public static final Set<String> ALLOWED_TAGS = Set.of(
            "clean", "good_equipment", "friendly_staff", "not_crowded", "good_value", "good_classes");

    private final ReviewRepository reviewRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final GymReviewRequestRecipientRepository recipientRepository;
    private final BranchRatingSummaryRepository summaryRepository;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public GymReviewService(
            ReviewRepository reviewRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            GymReviewRequestRecipientRepository recipientRepository,
            BranchRatingSummaryRepository summaryRepository) {
        this.reviewRepository = reviewRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.recipientRepository = recipientRepository;
        this.summaryRepository = summaryRepository;
    }

    /**
     * Saves (or replaces) the member's review of their branch and closes any pending
     * review request for them. The caller has already checked the member belongs to it.
     */
    @Transactional
    public Review save(Member member, Long globalUserId, Integer rating, List<String> tags, String comment, boolean anonymous) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        String text = comment == null ? null : comment.trim();
        if (text != null && text.length() > MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException("Review must be at most " + MAX_COMMENT_LENGTH + " characters");
        }
        List<String> cleanTags = tags == null ? List.of() : tags.stream().distinct().toList();
        if (!ALLOWED_TAGS.containsAll(cleanTags)) {
            throw new IllegalArgumentException("Unknown tag");
        }

        Long branchId = member.getBranchId();
        Review review = reviewRepository.findByBranchIdAndMemberId(branchId, member.getId()).orElseGet(Review::new);
        review.setBranchId(branchId);
        review.setMemberId(member.getId());
        review.setGlobalUserId(globalUserId);
        review.setRating(rating);
        review.setTags(new ArrayList<>(cleanTags));
        review.setComment(text == null || text.isEmpty() ? null : text);
        review.setAnonymous(anonymous);
        review = reviewRepository.saveAndFlush(review);

        for (GymReviewRequestRecipient r : recipientRepository.findByMemberIdAndStatus(member.getId(), GymReviewRequestRecipient.PENDING)) {
            r.setStatus(GymReviewRequestRecipient.RATED);
        }

        refreshPlatformSummary(branchId);
        return review;
    }

    /** Roll-up of one branch: average, count, star breakdown and most-picked tags. */
    @Transactional(readOnly = true)
    public GymRatingSummaryDTO summary(Long branchId) {
        long[] counts = starCounts(branchId);
        Map<String, Long> tagCounts = new HashMap<>();
        for (Review r : reviewRepository.findByBranchIdOrderByCreatedAtDesc(branchId)) {
            if (r.getTags() != null) r.getTags().forEach(t -> tagCounts.merge(t, 1L, Long::sum));
        }
        GymRatingSummaryDTO dto = toSummary(branchId, branchName(branchId), counts, reviewRepository.findLastReviewAt(branchId));
        dto.setTopTags(tagCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(6)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new)));
        return dto;
    }

    /** Every review of a branch, most recently updated first, with the author's name (for gym staff / platform admin). */
    @Transactional(readOnly = true)
    public List<GymReviewDTO> reviews(Long branchId) {
        List<Review> reviews = reviewRepository.findByBranchIdOrderByCreatedAtDesc(branchId).stream()
                .sorted(Comparator.comparing((Review r) -> r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        Map<Long, Member> members = memberRepository.findAllById(
                        reviews.stream().map(Review::getMemberId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        return reviews.stream().map(r -> {
            GymReviewDTO dto = new GymReviewDTO();
            dto.setId(r.getId());
            dto.setMemberId(r.getMemberId());
            Member m = members.get(r.getMemberId());
            dto.setMemberName(m != null ? m.getName() : "Member");
            dto.setAnonymous(r.isAnonymous());
            dto.setRating(r.getRating());
            dto.setTags(r.getTags());
            dto.setComment(r.getComment());
            dto.setCreatedAt(r.getCreatedAt());
            dto.setUpdatedAt(r.getUpdatedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    public long[] starCounts(Long branchId) {
        long[] counts = new long[5];
        for (Object[] row : reviewRepository.countByRatingForBranch(branchId)) {
            counts[(Integer) row[0] - 1] = (Long) row[1];
        }
        return counts;
    }

    public static GymRatingSummaryDTO toSummary(Long branchId, String branchName, long[] counts, java.time.LocalDateTime lastReviewAt) {
        long total = 0;
        long sum = 0;
        for (int i = 0; i < 5; i++) {
            total += counts[i];
            sum += counts[i] * (i + 1);
        }
        GymRatingSummaryDTO dto = new GymRatingSummaryDTO();
        dto.setBranchId(branchId);
        dto.setBranchName(branchName);
        dto.setRatingCount(total);
        dto.setAverageRating(total == 0 ? null : Math.round(sum * 10.0 / total) / 10.0);
        dto.setDistribution(Arrays.stream(counts).boxed().collect(Collectors.toList()));
        dto.setLastReviewAt(lastReviewAt);
        return dto;
    }

    private String branchName(Long branchId) {
        return branchRepository.findById(branchId).map(b -> b.getBranchName()).orElse(null);
    }

    /**
     * Best-effort: a failure here never fails the member's review — the startup
     * recompute (BranchRatingSummaryBackfillRunner) catches it up.
     */
    private void refreshPlatformSummary(Long branchId) {
        String tenantSlug = tenantRoutingEnabled ? TenantContextHolder.getCurrentTenant() : defaultTenantSlug;
        if (tenantSlug == null || tenantSlug.isBlank()) return;
        try {
            BranchRatingSummary summary = summaryRepository.findByTenantSlugAndBranchId(tenantSlug, branchId)
                    .orElseGet(() -> new BranchRatingSummary(tenantSlug, branchId));
            summary.setCounts(starCounts(branchId));
            summary.setBranchName(branchName(branchId));
            summary.setLastReviewAt(reviewRepository.findLastReviewAt(branchId));
            summaryRepository.save(summary);
        } catch (Exception e) {
            log.warn("Could not refresh rating summary for branch {} of tenant '{}': {}", branchId, tenantSlug, e.getMessage());
        }
    }
}
