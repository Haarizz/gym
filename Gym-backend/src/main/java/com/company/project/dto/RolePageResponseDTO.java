package com.company.project.dto;

import java.util.List;

public class RolePageResponseDTO {
    private List<RoleResponseDTO> data;
    private PaginationDTO pagination;

    public RolePageResponseDTO() {}

    public RolePageResponseDTO(List<RoleResponseDTO> data, PaginationDTO pagination) {
        this.data = data;
        this.pagination = pagination;
    }

    public List<RoleResponseDTO> getData() { return data; }
    public void setData(List<RoleResponseDTO> data) { this.data = data; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
