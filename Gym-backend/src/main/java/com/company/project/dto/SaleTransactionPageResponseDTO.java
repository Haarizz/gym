package com.company.project.dto;

import java.util.List;

public class SaleTransactionPageResponseDTO {

    private List<SaleTransactionResponseDTO> transactions;
    private PaginationDTO pagination;

    public SaleTransactionPageResponseDTO() {}

    public SaleTransactionPageResponseDTO(List<SaleTransactionResponseDTO> transactions, PaginationDTO pagination) {
        this.transactions = transactions;
        this.pagination = pagination;
    }

    public List<SaleTransactionResponseDTO> getTransactions() { return transactions; }
    public void setTransactions(List<SaleTransactionResponseDTO> transactions) { this.transactions = transactions; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
