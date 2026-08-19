package com.company.project.services;

import com.company.project.dto.ExpenseRequestDTO;
import com.company.project.dto.ExpenseResponseDTO;
import com.company.project.dto.ExpenseStatsDTO;
import com.company.project.entities.Expense;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.CostCenterRepository;
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
    private final FinancialEventService financialEventService;
    private final CostCenterRepository costCenterRepository;
    private final BranchService branchService;

    public ExpenseService(ExpenseRepository expenseRepository,
                          NotificationService notificationService,
                          FinancialEventService financialEventService,
                          CostCenterRepository costCenterRepository,
                          BranchService branchService) {
        this.expenseRepository    = expenseRepository;
        this.notificationService  = notificationService;
        this.financialEventService = financialEventService;
        this.costCenterRepository = costCenterRepository;
        this.branchService = branchService;
    }

    public List<ExpenseResponseDTO> getExpenses(String search, String status, String category,
                                                String location, LocalDate from, LocalDate to) {
        Long branchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        List<Expense> expenses = expenseRepository.findAllByOrderByDateDesc();
        return expenses.stream()
                .filter(e -> branchId == null || branchId.equals(e.getBranchId()))
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
        Long branchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        List<Expense> all = expenseRepository.findAllByOrderByDateDesc().stream()
                .filter(e -> branchId == null || branchId.equals(e.getBranchId()))
                .collect(Collectors.toList());
        
        BigDecimal totalAmount = all.stream()
                .filter(e -> "APPROVED".equalsIgnoreCase(e.getStatus()))
                .map(Expense::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        BigDecimal totalTax = all.stream()
                .filter(e -> "APPROVED".equalsIgnoreCase(e.getStatus()))
                .map(Expense::getTaxAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        long pending = all.stream().filter(e -> "PENDING".equalsIgnoreCase(e.getStatus())).count();
        long approved = all.stream().filter(e -> "APPROVED".equalsIgnoreCase(e.getStatus())).count();

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        all.stream().filter(e -> "APPROVED".equalsIgnoreCase(e.getStatus())).forEach(e -> {
            String cat = e.getCategory();
            if (cat != null) {
                byCategory.put(cat, byCategory.getOrDefault(cat, BigDecimal.ZERO).add(e.getTotalAmount()));
            }
        });

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
        // Since ExpenseRequestDTO doesn't have branchId, assume frontend adds it or it uses active branch.
        // Actually, we can just use the active branch. If it's null (All Branches), throw error.
        Long branchId = branchService.resolveBranchForCreate(null); // Assuming DTO lacks branchId for now, we force active branch
        expense.setBranchId(branchId);
        
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
        Expense saved = expenseRepository.save(expense);
        // Generate journal entry when expense is approved
        if ("approved".equalsIgnoreCase(status)) {
            financialEventService.onExpenseApproved(saved);
        }
        return ExpenseResponseDTO.fromEntity(saved);
    }

    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        expenseRepository.delete(expense);
    }

    private void applyRequest(Expense expense, ExpenseRequestDTO req) {
        validateCostCenter(req.getCostCenter());

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
        if (req.getPaymentStatus() != null && !req.getPaymentStatus().isBlank()) {
            expense.setPaymentStatus(req.getPaymentStatus());
        }
    }

    /** Blank/null is allowed (no forced dimension tagging) — only rejects unknown codes. */
    private void validateCostCenter(String costCenterCode) {
        if (costCenterCode == null || costCenterCode.isBlank()) return;
        if (costCenterRepository.findByCode(costCenterCode).isEmpty()) {
            throw new BusinessRuleViolationException("Unknown cost center code: " + costCenterCode);
        }
    }
}
