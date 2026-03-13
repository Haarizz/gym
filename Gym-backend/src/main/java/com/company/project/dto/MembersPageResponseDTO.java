package com.company.project.dto;

import java.util.List;

/**
 * Paginated members response.
 * Serializes as:
 * {
 *   "members": [...],
 *   "pagination": { "page":1, "limit":20, "total":100, "totalPages":5 }
 * }
 */
public class MembersPageResponseDTO {

    private List<MemberResponseDTO> members;
    private PaginationDTO pagination;

    public MembersPageResponseDTO() {}

    public MembersPageResponseDTO(List<MemberResponseDTO> members, PaginationDTO pagination) {
        this.members    = members;
        this.pagination = pagination;
    }

    public List<MemberResponseDTO> getMembers() { return members; }
    public void setMembers(List<MemberResponseDTO> members) { this.members = members; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
