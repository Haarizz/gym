package com.company.project.services;

import com.company.project.dto.ExpenseRequestDTO;
import com.company.project.dto.ExpenseResponseDTO;
import com.company.project.dto.ExpenseStatsDTO;
import com.company.project.entities.Expense;
import com.company.project.repositories.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final NotificationService notificationService;

    public ExpenseService(ExpenseRepository expenseRepository, NotificationService notificationService) {
        this.expenseRepository = expenseRepository;
        this.notificationService = notificationService;
    }

    public List<ExpenseResponseDTO> getExpenses(String search, String status, String category,
                                                String location, LocalDate from, LocalDate to) {
        List<Expense> expenses = expenseRepository.findAllByOrderByDateDesc();
        return expenses.stream()
                .filter(e -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (e.getVendorName() != null && e.getVendorName().toLowerCase(Locale.ROOT).contains(s))
                            || (e.getCategory() != null && e.getCategory().toLowerCase(Locale.ROOT).contains(s))
                            || (e.getNotes() != null && e.getNotes().toLowerCase(Locale.ROOT).contains(s));
                })
                .filter(e -> status == null || status.isBlank() || status.equalsIgnoreCase("all")
                        || (e.getStatus() != null && e.getStatus().equalsIgnoreCase(status)))
                .filter(e -> category == null || category.isBlank() || category.equalsIgnoreCase("all")
                        || (e.getCategory() != null && e.getCategory().equalsIgnoreCase(category)))
                .filter(e -> location == null || location.isBlank()
                        || (e.getLocation() != null && e.getLocation().equalsIgnoreCase(location)))
                .filter(e -> from == null || (e.getDate() != null && !e.getDate().isBefore(from)))
                .filter(e -> to == null || (e.getDate() != null && !e.getDate().isAfter(to)))
                .map(ExpenseResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public ExpenseStatsDTO getStats() {
        List<Expense> all = expenseRepository.findAllByOrderByDateDesc();
        BigDecimal totalAmount = expenseRepository.sumApprovedTotal();
        BigDecimal totalTax = expenseRepository.sumApprovedTax();
        long pending = expenseRepository.countByStatus("PENDING");
        long approved = expenseRepository.countByStatus("APPROVED");

        List<Object[]> byCatRaw = expenseRepository.sumByCategory();
        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        for (Object[] row : byCatRaw) {
            String cat = (String) row[0];
            BigDecimal sum = (BigDecimal) row[1];
            if (cat != null) byCategory.put(cat, sum);
        }

        ExpenseStatsDTO stats = new ExpenseStatsDTO();
        stats.setTotalAmount(totalAmount);
        stats.setTotalTax(totalTax);
        stats.setTotalCount(all.size());
        stats.setPendingCount(pending);
        stats.setApprovedCount(approved);
        stats.setByCategory(byCategory);
        return stats;
    }

    public ExpenseResponseDTO createExpense(ExpenseRequestDTO req) {
        Expense expense = new Expense();
        applyRequest(expense, req);
        expense.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "pending");
        Expense saved = expenseRepository.save(expense);
        notificationService.notifyRoles(
                List.of("ADMIN", "ACCOUNTANT"),
                "New Expense Submitted",
                "Expense of " + (saved.getTotalAmount() != null ? "AED " + saved.getTotalAmount() : "") +
                " from " + (saved.getVendorName() != null ? saved.getVendorName() : "vendor") + " is pending review.",
                "INFO", "LOW", "FINANCIALS",
                saved.getId(), "/expenses",
                "EXPENSE_CREATED_" + saved.getId()
        );
        return ExpenseResponseDTO.fromEntity(saved);
    }

    public ExpenseResponseDTO updateExpense(Long id, ExpenseRequestDTO req) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        applyRequest(expense, req);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            expense.setStatus(req.getStatus());
        }
        return ExpenseResponseDTO.fromEntity(expenseRepository.save(expense));
    }

    public ExpenseResponseDTO updateStatus(Long id, String status) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        expense.setStatus(status);
        return ExpenseResponseDTO.fromEntity(expenseRepository.save(expense));
    }

    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        expenseRepository.delete(expense);
    }

    private void applyRequest(Expense expense, ExpenseRequestDTO req) {
        expense.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        expense.setVendorName(req.getVendorName());
        expense.setCategory(req.getCategory());
        expense.setCostCenter(req.getCostCenter());
        expense.setLocation(req.getLocation());

        BigDecimal amount = req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO;
        BigDecimal taxRate = req.getTaxRate() != null ? req.getTaxRate() : BigDecimal.ZERO;
        BigDecimal taxAmount = amount.multiply(taxRate)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = amount.add(taxAmount);

        expense.setAmount(amount);
        expense.setTaxRate(taxRate);
        expense.setTaxAmount(taxAmount);
        expense.setTotalAmount(totalAmount);
        expense.setNotes(req.getNotes());
        expense.setReceiptUrl(req.getReceiptUrl());
    }
}
