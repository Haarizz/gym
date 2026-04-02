package com.company.project.dto;

public class ToggleCommunityLikeResponseDTO {

    private boolean liked;
    private int likeCount;

    public ToggleCommunityLikeResponseDTO() {}

    public ToggleCommunityLikeResponseDTO(boolean liked, int likeCount) {
        this.liked = liked;
        this.likeCount = likeCount;
    }

    public boolean isLiked() { return liked; }
    public void setLiked(boolean liked) { this.liked = liked; }

    public int getLikeCount() { return likeCount; }
    public void setLikeCount(int likeCount) { this.likeCount = likeCount; }
}

