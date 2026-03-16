package com.company.project.dto;

import java.util.List;

public class StaffPageResponseDTO {
    private List<StaffResponseDTO> items;
    private PaginationDTO pagination;

    public StaffPageResponseDTO() {}
    public StaffPageResponseDTO(List<StaffResponseDTO> items, PaginationDTO pagination) {
        this.items = items;
        this.pagination = pagination;
    }

    public List<StaffResponseDTO> getItems() { return items; }
    public void setItems(List<StaffResponseDTO> items) { this.items = items; }
    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
