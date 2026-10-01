package com.company.project.dto;

import java.util.List;

public class CommunityPostsPageResponseDTO {

    private List<CommunityPostResponseDTO> posts;
    private PaginationDTO pagination;
    // canPost: may create posts in this gym. canInteract: may like and comment —
    // wider than canPost, since an active membership at any gym unlocks it.
    private boolean canPost;
    private boolean canInteract;

    public CommunityPostsPageResponseDTO() {}

    public CommunityPostsPageResponseDTO(List<CommunityPostResponseDTO> posts, PaginationDTO pagination) {
        this.posts = posts;
        this.pagination = pagination;
    }

    public List<CommunityPostResponseDTO> getPosts() { return posts; }
    public void setPosts(List<CommunityPostResponseDTO> posts) { this.posts = posts; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }

    public boolean isCanPost() { return canPost; }
    public void setCanPost(boolean canPost) { this.canPost = canPost; }

    public boolean isCanInteract() { return canInteract; }
    public void setCanInteract(boolean canInteract) { this.canInteract = canInteract; }
}

