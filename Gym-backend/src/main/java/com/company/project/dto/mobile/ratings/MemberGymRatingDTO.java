package com.company.project.dto.mobile.ratings;

import java.time.LocalDateTime;
import java.util.List;

/** The member's own gym (branch), their rating of it, and whether the gym asked them to rate it. */
public class MemberGymRatingDTO {
    private Long branchId;
    private String branchName;
    /** True while a review request is waiting — the app opens the rate sheet on launch. */
    private boolean pendingRequest;
    private MyReview myReview;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public boolean isPendingRequest() { return pendingRequest; }
    public void setPendingRequest(boolean pendingRequest) { this.pendingRequest = pendingRequest; }

    public MyReview getMyReview() { return myReview; }
    public void setMyReview(MyReview myReview) { this.myReview = myReview; }

    public static class MyReview {
        private Integer rating;
        private List<String> tags;
        private String comment;
        private boolean anonymous;
        private LocalDateTime updatedAt;

        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }

        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }

        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }

        public boolean isAnonymous() { return anonymous; }
        public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

        public LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }
}
