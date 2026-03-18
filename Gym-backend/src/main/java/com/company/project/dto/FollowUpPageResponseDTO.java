package com.company.project.dto;

import java.util.List;

public class FollowUpPageResponseDTO {

    private List<FollowUpResponseDTO> followUps;
    private PaginationDTO pagination;

    public FollowUpPageResponseDTO(List<FollowUpResponseDTO> followUps, PaginationDTO pagination) {
        this.followUps = followUps;
        this.pagination = pagination;
    }

    public List<FollowUpResponseDTO> getFollowUps() { return followUps; }
    public void setFollowUps(List<FollowUpResponseDTO> followUps) { this.followUps = followUps; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
