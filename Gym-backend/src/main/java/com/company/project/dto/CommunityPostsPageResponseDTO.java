package com.company.project.dto;

import java.util.List;

public class CommunityPostsPageResponseDTO {

    private List<CommunityPostResponseDTO> posts;
    private PaginationDTO pagination;

    public CommunityPostsPageResponseDTO() {}

    public CommunityPostsPageResponseDTO(List<CommunityPostResponseDTO> posts, PaginationDTO pagination) {
        this.posts = posts;
        this.pagination = pagination;
    }

    public List<CommunityPostResponseDTO> getPosts() { return posts; }
    public void setPosts(List<CommunityPostResponseDTO> posts) { this.posts = posts; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}

