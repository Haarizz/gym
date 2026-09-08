package com.company.project.dto;

import java.util.List;

public class ExpensesPageResponseDTO {

    private List<ExpenseResponseDTO> expenses;
    private PaginationDTO pagination;

    public ExpensesPageResponseDTO() {}

    public ExpensesPageResponseDTO(List<ExpenseResponseDTO> expenses, PaginationDTO pagination) {
        this.expenses = expenses;
        this.pagination = pagination;
    }

    public List<ExpenseResponseDTO> getExpenses() { return expenses; }
    public void setExpenses(List<ExpenseResponseDTO> expenses) { this.expenses = expenses; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
