package com.company.project.dto;

import java.util.List;

public class PurchaseOrderPageResponseDTO {

    private List<PurchaseOrderResponseDTO> orders;
    private PaginationDTO pagination;

    public PurchaseOrderPageResponseDTO() {}

    public PurchaseOrderPageResponseDTO(List<PurchaseOrderResponseDTO> orders, PaginationDTO pagination) {
        this.orders = orders;
        this.pagination = pagination;
    }

    public List<PurchaseOrderResponseDTO> getOrders() { return orders; }
    public void setOrders(List<PurchaseOrderResponseDTO> orders) { this.orders = orders; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
