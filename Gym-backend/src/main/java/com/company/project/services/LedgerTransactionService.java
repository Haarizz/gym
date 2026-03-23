package com.company.project.services;

import com.company.project.dto.LedgerTransactionDTO;
import com.company.project.entities.Expense;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.repositories.ExpenseRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.PaymentVoucherRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LedgerTransactionService {

    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final PaymentVoucherRepository paymentVoucherRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final ExpenseRepository expenseRepository;

    public LedgerTransactionService(ReceiptVoucherRepository receiptVoucherRepository,
                                     PaymentVoucherRepository paymentVoucherRepository,
                                     JournalVoucherRepository journalVoucherRepository,
                                     ExpenseRepository expenseRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.expenseRepository = expenseRepository;
    }

    public List<LedgerTransactionDTO> getTransactions(LocalDate from, LocalDate to, String type, String search) {
        List<LedgerTransactionDTO> result = new ArrayList<>();

        // Receipt Vouchers (completed/all)
        if (type == null || type.isBlank() || "receipt".equalsIgnoreCase(type)) {
            List<ReceiptVoucher> rvs = (from != null && to != null)
                    ? receiptVoucherRepository.findByDateBetweenOrderByDateDesc(from, to)
                    : receiptVoucherRepository.findAllByOrderByDateDesc();
            for (ReceiptVoucher rv : rvs) {
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("RV-" + rv.getId());
                dto.setDate(rv.getDate());
                dto.setType("Receipt Voucher");
                dto.setReferenceNo(rv.getVoucherNo());
                dto.setDescription(rv.getSource() != null ? rv.getSource() : rv.getSourceCategory());
                dto.setDebit(BigDecimal.ZERO);
                dto.setCredit(rv.getAmount() != null ? rv.getAmount() : BigDecimal.ZERO);
                dto.setBranch(rv.getBranch());
                dto.setStatus(rv.getStatus());
                dto.setCostCenter(null);
                result.add(dto);
            }
        }

        // Payment Vouchers
        if (type == null || type.isBlank() || "payment".equalsIgnoreCase(type)) {
            List<PaymentVoucher> pvs = paymentVoucherRepository.findAllByOrderByPaymentDateDesc();
            for (PaymentVoucher pv : pvs) {
                LocalDate date = pv.getPaymentDate();
                if (date == null) continue;
                if (from != null && date.isBefore(from)) continue;
                if (to != null && date.isAfter(to)) continue;
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("PV-" + pv.getId());
                dto.setDate(date);
                dto.setType("Payment Voucher");
                dto.setReferenceNo(pv.getVoucherNo());
                dto.setDescription(pv.getDescription() != null ? pv.getDescription() : pv.getSupplierName());
                dto.setDebit(pv.getAmount() != null ? pv.getAmount() : BigDecimal.ZERO);
                dto.setCredit(BigDecimal.ZERO);
                dto.setBranch(null);
                dto.setStatus(pv.getStatus());
                dto.setCostCenter(null);
                result.add(dto);
            }
        }

        // Journal Vouchers (posted)
        if (type == null || type.isBlank() || "journal".equalsIgnoreCase(type)) {
            List<JournalVoucher> jvs = journalVoucherRepository.findAllByOrderByDateDesc();
            for (JournalVoucher jv : jvs) {
                if (!"POSTED".equalsIgnoreCase(jv.getStatus())) continue;
                LocalDate date = jv.getDate();
                if (from != null && date.isBefore(from)) continue;
                if (to != null && date.isAfter(to)) continue;
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("JV-" + jv.getId());
                dto.setDate(date);
                dto.setType("Journal Voucher");
                dto.setReferenceNo(jv.getVoucherNo());
                dto.setDescription(jv.getNarration());
                dto.setDebit(jv.getTotalDebit() != null ? jv.getTotalDebit() : BigDecimal.ZERO);
                dto.setCredit(jv.getTotalCredit() != null ? jv.getTotalCredit() : BigDecimal.ZERO);
                dto.setBranch(null);
                dto.setStatus(jv.getStatus());
                dto.setCostCenter(null);
                result.add(dto);
            }
        }

        // Expenses (approved)
        if (type == null || type.isBlank() || "expense".equalsIgnoreCase(type)) {
            List<Expense> expenses = (from != null && to != null)
                    ? expenseRepository.findByDateBetweenOrderByDateDesc(from, to)
                    : expenseRepository.findAllByOrderByDateDesc();
            for (Expense e : expenses) {
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("EXP-" + e.getId());
                dto.setDate(e.getDate());
                dto.setType("Expense");
                dto.setReferenceNo("EXP-" + String.format("%05d", e.getId()));
                dto.setDescription(e.getCategory() + (e.getVendorName() != null ? " - " + e.getVendorName() : ""));
                dto.setDebit(e.getTotalAmount() != null ? e.getTotalAmount() : BigDecimal.ZERO);
                dto.setCredit(BigDecimal.ZERO);
                dto.setBranch(e.getLocation());
                dto.setStatus(e.getStatus());
                dto.setCostCenter(e.getCostCenter());
                result.add(dto);
            }
        }

        // Apply search filter
        if (search != null && !search.isBlank()) {
            String s = search.toLowerCase(Locale.ROOT);
            result = result.stream()
                    .filter(t -> (t.getReferenceNo() != null && t.getReferenceNo().toLowerCase(Locale.ROOT).contains(s))
                            || (t.getDescription() != null && t.getDescription().toLowerCase(Locale.ROOT).contains(s))
                            || (t.getType() != null && t.getType().toLowerCase(Locale.ROOT).contains(s)))
                    .collect(Collectors.toList());
        }

        result.sort(Comparator.comparing(LedgerTransactionDTO::getDate, Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }
}
