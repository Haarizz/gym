package com.company.project.dto;

import java.util.List;

public class SalesInvoicesPageResponseDTO {

    private List<SalesInvoiceResponseDTO> invoices;
    private PaginationDTO pagination;

    public SalesInvoicesPageResponseDTO() {}

    public SalesInvoicesPageResponseDTO(List<SalesInvoiceResponseDTO> invoices, PaginationDTO pagination) {
        this.invoices = invoices;
        this.pagination = pagination;
    }

    public List<SalesInvoiceResponseDTO> getInvoices() { return invoices; }
    public void setInvoices(List<SalesInvoiceResponseDTO> invoices) { this.invoices = invoices; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
