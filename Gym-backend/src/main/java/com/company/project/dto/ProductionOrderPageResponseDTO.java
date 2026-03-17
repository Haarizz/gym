package com.company.project.dto;

import java.util.List;

public class ProductionOrderPageResponseDTO {

    private List<ProductionOrderResponseDTO> orders;
    private PaginationDTO pagination;

    public ProductionOrderPageResponseDTO(List<ProductionOrderResponseDTO> orders, PaginationDTO pagination) {
        this.orders = orders;
        this.pagination = pagination;
    }

    public List<ProductionOrderResponseDTO> getOrders() { return orders; }
    public void setOrders(List<ProductionOrderResponseDTO> orders) { this.orders = orders; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
