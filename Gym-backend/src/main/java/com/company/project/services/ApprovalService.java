package com.company.project.services;

import com.company.project.entities.Expense;
import com.company.project.entities.JournalVoucher;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ExpenseRepository;
import com.company.project.repositories.JournalVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ApprovalService {

    private final ExpenseRepository expenseRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final FinancialEventService financialEventService;

    public ApprovalService(ExpenseRepository expenseRepository, 
                           JournalVoucherRepository journalVoucherRepository,
                           FinancialEventService financialEventService) {
        this.expenseRepository = expenseRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.financialEventService = financialEventService;
    }

    public void approveExpense(Long expenseId, String approvedBy) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));
        
        if ("APPROVED".equals(expense.getApprovalStatus())) return;

        expense.setApprovalStatus("APPROVED");
        expense.setApprovedBy(approvedBy);
        expenseRepository.save(expense);

        financialEventService.onExpenseApproved(expense);
    }

    public void rejectExpense(Long expenseId, String rejectedBy, String reason) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));
        
        expense.setApprovalStatus("REJECTED");
        expense.setApprovedBy(rejectedBy);
        expense.setRejectionReason(reason);
        expenseRepository.save(expense);
    }

    public void approveJournalVoucher(Long jvId, String approvedBy) {
        JournalVoucher jv = journalVoucherRepository.findById(jvId)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found"));
        
        if ("APPROVED".equals(jv.getApprovalStatus())) return;

        jv.setApprovalStatus("APPROVED");
        jv.setApprovedBy(approvedBy);
        // Note: For manually entered JVs, the posting logic (AccountHead update)
        // should be triggered here, analogous to FinancialEventService.createAndPost
        
        journalVoucherRepository.save(jv);
    }

    public void rejectJournalVoucher(Long jvId, String rejectedBy, String reason) {
        JournalVoucher jv = journalVoucherRepository.findById(jvId)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found"));
        
        jv.setApprovalStatus("REJECTED");
        jv.setApprovedBy(rejectedBy);
        jv.setRejectionReason(reason);
        journalVoucherRepository.save(jv);
    }
}
