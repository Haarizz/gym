package com.company.project.dto;

import java.util.List;

public class SupplierBillsPageResponseDTO {

    private List<SupplierBillResponseDTO> bills;
    private PaginationDTO pagination;

    public SupplierBillsPageResponseDTO() {}

    public SupplierBillsPageResponseDTO(List<SupplierBillResponseDTO> bills, PaginationDTO pagination) {
        this.bills = bills;
        this.pagination = pagination;
    }

    public List<SupplierBillResponseDTO> getBills() { return bills; }
    public void setBills(List<SupplierBillResponseDTO> bills) { this.bills = bills; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
