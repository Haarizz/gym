package com.company.project.dto;

import java.util.List;

public class LedgerTransactionsPageResponseDTO {

    private List<LedgerTransactionDTO> transactions;
    private PaginationDTO pagination;

    public LedgerTransactionsPageResponseDTO() {}

    public LedgerTransactionsPageResponseDTO(List<LedgerTransactionDTO> transactions, PaginationDTO pagination) {
        this.transactions = transactions;
        this.pagination = pagination;
    }

    public List<LedgerTransactionDTO> getTransactions() { return transactions; }
    public void setTransactions(List<LedgerTransactionDTO> transactions) { this.transactions = transactions; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
