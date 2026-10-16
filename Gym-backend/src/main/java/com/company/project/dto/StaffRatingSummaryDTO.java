package com.company.project.dto;

import java.util.List;

/** Aggregate rating of one staff member: average, total and per-star counts (index 0 = 1 star). */
public class StaffRatingSummaryDTO {
    private Long staffId;
    private Double averageRating;
    private Long ratingCount;
    private List<Long> distribution;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Long getRatingCount() { return ratingCount; }
    public void setRatingCount(Long ratingCount) { this.ratingCount = ratingCount; }

    public List<Long> getDistribution() { return distribution; }
    public void setDistribution(List<Long> distribution) { this.distribution = distribution; }
}
