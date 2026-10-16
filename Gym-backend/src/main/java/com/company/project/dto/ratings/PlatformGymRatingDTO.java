package com.company.project.dto.ratings;

import java.time.LocalDateTime;
import java.util.List;

/** One gym (tenant) on the platform admin's Ratings list, with its branches. */
public class PlatformGymRatingDTO {
    private String tenantSlug;
    private String gymName;
    private Double averageRating;
    private Long ratingCount;
    private LocalDateTime lastReviewAt;
    private List<GymRatingSummaryDTO> branches;

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Long getRatingCount() { return ratingCount; }
    public void setRatingCount(Long ratingCount) { this.ratingCount = ratingCount; }

    public LocalDateTime getLastReviewAt() { return lastReviewAt; }
    public void setLastReviewAt(LocalDateTime lastReviewAt) { this.lastReviewAt = lastReviewAt; }

    public List<GymRatingSummaryDTO> getBranches() { return branches; }
    public void setBranches(List<GymRatingSummaryDTO> branches) { this.branches = branches; }
}
