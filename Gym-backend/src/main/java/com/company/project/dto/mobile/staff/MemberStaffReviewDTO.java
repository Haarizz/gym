package com.company.project.dto.mobile.staff;

import java.time.LocalDateTime;
import java.util.List;

/** A rating as other members see it — author hidden when posted anonymously. */
public class MemberStaffReviewDTO {
    private Long id;
    /** Null when anonymous. */
    private String authorName;
    private boolean anonymous;
    /** True for the calling member's own rating. */
    private boolean mine;
    private Integer rating;
    private List<String> tags;
    private String comment;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

    public boolean isMine() { return mine; }
    public void setMine(boolean mine) { this.mine = mine; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
