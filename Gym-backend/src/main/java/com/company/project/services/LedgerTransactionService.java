package com.company.project.services;

import com.company.project.dto.LedgerTransactionDTO;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.ReceiptVoucher;
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

/**
 * LedgerTransactionService — combined ledger activity view used by the UI.
 *
 * Data sources:
 *
 *   RECEIPT VOUCHERS  — Manually created accountant documents for incoming cash.
 *                       Displayed as business documents (informational). They do
 *                       NOT generate journal entries directly (member payments do,
 *                       via ReceiptService.settlePayment → FinancialEventService).
 *
 *   PAYMENT VOUCHERS  — Outgoing payment documents. When marked Paid they
 *                       auto-generate a JV via FinancialEventService, so the
 *                       ledger impact is captured in the JOURNAL VOUCHERS section.
 *
 *   JOURNAL VOUCHERS  — POSTED entries only. Includes BOTH:
 *                       • System-generated entries (from sales, payroll, expenses,
 *                         assets, supplier bills, member payments, etc.)
 *                       • Manually entered entries by the accountant
 *                       The narration clearly identifies the origin.
 *
 * NOTE: The old "Expenses" section has been REMOVED.
 * Approved expenses now automatically generate a Journal Voucher via
 * FinancialEventService.onExpenseApproved(). Showing expenses separately would
 * cause double-counting in any view that also shows POSTED journal entries.
 */
@Service
@Transactional(readOnly = true)
public class LedgerTransactionService {

    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final PaymentVoucherRepository paymentVoucherRepository;
    private final JournalVoucherRepository journalVoucherRepository;

    public LedgerTransactionService(ReceiptVoucherRepository receiptVoucherRepository,
                                     PaymentVoucherRepository paymentVoucherRepository,
                                     JournalVoucherRepository journalVoucherRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.journalVoucherRepository = journalVoucherRepository;
    }

    public List<LedgerTransactionDTO> getTransactions(LocalDate from, LocalDate to,
                                                       String type, String search) {
        List<LedgerTransactionDTO> result = new ArrayList<>();

        // ── 1. RECEIPT VOUCHERS (informational accounting documents) ─────────
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

        // ── 2. PAYMENT VOUCHERS (business documents) ─────────────────────────
        //    When status = Paid, a JV is also auto-generated. Show both:
        //    the PV as the business authorization and the JV as the ledger entry.
        if (type == null || type.isBlank() || "payment".equalsIgnoreCase(type)) {
            List<PaymentVoucher> pvs = paymentVoucherRepository.findAllByOrderByPaymentDateDesc();
            for (PaymentVoucher pv : pvs) {
                LocalDate date = pv.getPaymentDate();
                if (date == null) continue;
                if (from != null && date.isBefore(from)) continue;
                if (to   != null && date.isAfter(to))   continue;
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("PV-" + pv.getId());
                dto.setDate(date);
                dto.setType("Payment Voucher");
                dto.setReferenceNo(pv.getVoucherNo());
                dto.setDescription(
                        pv.getDescription() != null ? pv.getDescription() : pv.getSupplierName());
                dto.setDebit(pv.getAmount() != null ? pv.getAmount() : BigDecimal.ZERO);
                dto.setCredit(BigDecimal.ZERO);
                dto.setBranch(null);
                dto.setStatus(pv.getStatus());
                dto.setCostCenter(null);
                result.add(dto);
            }
        }

        // ── 3. JOURNAL VOUCHERS (POSTED only — the actual ledger) ────────────
        //    This is the single source of truth for financial data. Includes:
        //    - Auto-generated JVs from all business events (labelled "System")
        //    - Manually entered JVs from the accountant
        if (type == null || type.isBlank() || "journal".equalsIgnoreCase(type)) {
            List<JournalVoucher> jvs = journalVoucherRepository.findAllByOrderByDateDesc();
            for (JournalVoucher jv : jvs) {
                if (!"POSTED".equalsIgnoreCase(jv.getStatus())) continue;
                LocalDate date = jv.getDate();
                if (from != null && date != null && date.isBefore(from)) continue;
                if (to   != null && date != null && date.isAfter(to))   continue;
                LedgerTransactionDTO dto = new LedgerTransactionDTO();
                dto.setId("JV-" + jv.getId());
                dto.setDate(date);
                // Distinguish system-generated from manual so the UI can render differently
                dto.setType(jv.isSystemGenerated() ? "System Journal" : "Journal Voucher");
                dto.setReferenceNo(jv.getVoucherNo());
                dto.setDescription(jv.getNarration());
                dto.setDebit(jv.getTotalDebit()  != null ? jv.getTotalDebit()  : BigDecimal.ZERO);
                dto.setCredit(jv.getTotalCredit() != null ? jv.getTotalCredit() : BigDecimal.ZERO);
                dto.setBranch(null);
                dto.setStatus(jv.getStatus());
                dto.setCostCenter(null);
                result.add(dto);
            }
        }

        // ── Search filter ─────────────────────────────────────────────────────
        if (search != null && !search.isBlank()) {
            String s = search.toLowerCase(Locale.ROOT);
            result = result.stream()
                    .filter(t ->
                            (t.getReferenceNo()  != null && t.getReferenceNo() .toLowerCase(Locale.ROOT).contains(s))
                         || (t.getDescription() != null && t.getDescription().toLowerCase(Locale.ROOT).contains(s))
                         || (t.getType()        != null && t.getType()       .toLowerCase(Locale.ROOT).contains(s)))
                    .collect(Collectors.toList());
        }

        result.sort(Comparator.comparing(LedgerTransactionDTO::getDate,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }
}
