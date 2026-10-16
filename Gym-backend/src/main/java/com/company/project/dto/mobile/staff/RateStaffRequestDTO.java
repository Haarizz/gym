package com.company.project.dto.mobile.staff;

import java.util.List;

public class RateStaffRequestDTO {
    private Integer rating;
    private List<String> tags;
    private String comment;
    private boolean anonymous;

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }
}
