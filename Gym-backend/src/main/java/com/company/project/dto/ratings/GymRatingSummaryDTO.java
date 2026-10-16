package com.company.project.dto.ratings;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** One branch's rating roll-up. */
public class GymRatingSummaryDTO {
    private Long branchId;
    private String branchName;
    /** Null until someone rates it. */
    private Double averageRating;
    private Long ratingCount;
    /** Count per star value; index 0 = 1 star. */
    private List<Long> distribution;
    /** "What stood out" key → how many picked it, most picked first. Null in list views. */
    private Map<String, Long> topTags;
    private LocalDateTime lastReviewAt;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Long getRatingCount() { return ratingCount; }
    public void setRatingCount(Long ratingCount) { this.ratingCount = ratingCount; }

    public List<Long> getDistribution() { return distribution; }
    public void setDistribution(List<Long> distribution) { this.distribution = distribution; }

    public Map<String, Long> getTopTags() { return topTags; }
    public void setTopTags(Map<String, Long> topTags) { this.topTags = topTags; }

    public LocalDateTime getLastReviewAt() { return lastReviewAt; }
    public void setLastReviewAt(LocalDateTime lastReviewAt) { this.lastReviewAt = lastReviewAt; }
}
