package com.company.project.dto.mobile.staff;

import java.util.List;
import java.util.Map;

/** A staff member's profile in the member app: card info, rating breakdown and reviews. */
public class MemberStaffProfileDTO {
    private MemberStaffCardDTO staff;
    /** Count per star value; index 0 = 1 star. */
    private List<Long> distribution;
    /** "What stood out" key → how many members picked it, most picked first. */
    private Map<String, Long> topTags;
    private List<MemberStaffReviewDTO> reviews;
    /** The calling member's own rating, to prefill the rate sheet. */
    private MemberStaffReviewDTO myReview;

    public MemberStaffCardDTO getStaff() { return staff; }
    public void setStaff(MemberStaffCardDTO staff) { this.staff = staff; }

    public List<Long> getDistribution() { return distribution; }
    public void setDistribution(List<Long> distribution) { this.distribution = distribution; }

    public Map<String, Long> getTopTags() { return topTags; }
    public void setTopTags(Map<String, Long> topTags) { this.topTags = topTags; }

    public List<MemberStaffReviewDTO> getReviews() { return reviews; }
    public void setReviews(List<MemberStaffReviewDTO> reviews) { this.reviews = reviews; }

    public MemberStaffReviewDTO getMyReview() { return myReview; }
    public void setMyReview(MemberStaffReviewDTO myReview) { this.myReview = myReview; }
}
