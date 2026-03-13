package com.company.project.dto;

import java.util.List;

/**
 * Paginated member addons response.
 * Serializes as:
 * {
 *   "addons": [...],
 *   "pagination": { "page":1, "limit":100, "total":50, "totalPages":1 }
 * }
 */
public class MemberAddonPageResponseDTO {

    private List<MemberAddonResponseDTO> addons;
    private PaginationDTO pagination;

    public MemberAddonPageResponseDTO() {}

    public MemberAddonPageResponseDTO(List<MemberAddonResponseDTO> addons, PaginationDTO pagination) {
        this.addons     = addons;
        this.pagination = pagination;
    }

    public List<MemberAddonResponseDTO> getAddons() { return addons; }
    public void setAddons(List<MemberAddonResponseDTO> addons) { this.addons = addons; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
