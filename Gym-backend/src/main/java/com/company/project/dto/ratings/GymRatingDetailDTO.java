package com.company.project.dto.ratings;

import java.util.List;

/** One branch's ratings page: summary, every review, and (gym admin only) review-request status. */
public class GymRatingDetailDTO {
    private GymRatingSummaryDTO summary;
    private List<GymReviewDTO> reviews;
    private GymReviewRequestStatusDTO request;

    public GymRatingSummaryDTO getSummary() { return summary; }
    public void setSummary(GymRatingSummaryDTO summary) { this.summary = summary; }

    public List<GymReviewDTO> getReviews() { return reviews; }
    public void setReviews(List<GymReviewDTO> reviews) { this.reviews = reviews; }

    public GymReviewRequestStatusDTO getRequest() { return request; }
    public void setRequest(GymReviewRequestStatusDTO request) { this.request = request; }
}
