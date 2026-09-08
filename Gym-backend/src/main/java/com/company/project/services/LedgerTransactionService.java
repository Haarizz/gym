package com.company.project.services;

import com.company.project.dto.LedgerTransactionDTO;
import com.company.project.dto.LedgerTransactionsPageResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.PaymentVoucherRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final JournalVoucherLineRepository journalVoucherLineRepository;

    public LedgerTransactionService(ReceiptVoucherRepository receiptVoucherRepository,
                                     PaymentVoucherRepository paymentVoucherRepository,
                                     JournalVoucherRepository journalVoucherRepository,
                                     JournalVoucherLineRepository journalVoucherLineRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
    }

    /**
     * Real, capped pagination over a UNION of three different entity types (Receipt
     * Vouchers, Payment Vouchers, POSTED Journal Vouchers) — not a single JPA query,
     * since there's no one entity to build a Page<T> from. Each source is still
     * fetched branch-scoped and date-filtered at the query level exactly as before;
     * the three lists are merged and sorted as before, and only the requested page
     * is returned along with a real total count, so the response is finally bounded
     * instead of shipping every transaction ever recorded to the browser in one call.
     */
    public LedgerTransactionsPageResponseDTO getTransactionsPage(LocalDate from, LocalDate to,
                                                                  String type, String search,
                                                                  int page, int limit) {
        List<LedgerTransactionDTO> all = getTransactions(from, to, type, search);
        int total = all.size();
        int totalPages = (int) Math.ceil(total / (double) limit);
        int fromIndex = Math.min((page - 1) * limit, total);
        int toIndex = Math.min(fromIndex + limit, total);
        List<LedgerTransactionDTO> pageContent = all.subList(fromIndex, toIndex);

        PaginationDTO pagination = new PaginationDTO(page, limit, total, totalPages);
        return new LedgerTransactionsPageResponseDTO(pageContent, pagination);
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
            List<PaymentVoucher> pvs = (from != null && to != null)
                    ? paymentVoucherRepository.findByPaymentDateBetweenOrderByPaymentDateDesc(from, to)
                    : paymentVoucherRepository.findAllByOrderByPaymentDateDesc();
            for (PaymentVoucher pv : pvs) {
                LocalDate date = pv.getPaymentDate();
                if (date == null) continue;
                // Only needed for the single-bound (from-only or to-only) case —
                // the from+to case is already filtered at the query level above.
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
            List<JournalVoucher> jvs = (from != null && to != null)
                    ? journalVoucherRepository.findByStatusAndDateBetweenOrderByDateDesc("POSTED", from, to)
                    : journalVoucherRepository.findByStatusOrderByDateDesc("POSTED");

            // Batch-fetch every line for every JV in one query rather than one query per
            // voucher, and take the first non-null cost center as "the" cost center for
            // that voucher row — a JV can have lines on several cost centers at once, so
            // this is a representative value for the list view, not a guaranteed-unique one.
            List<Long> jvIds = jvs.stream().map(JournalVoucher::getId).collect(Collectors.toList());
            Map<Long, String> costCenterByJvId = new HashMap<>();
            if (!jvIds.isEmpty()) {
                for (JournalVoucherLine line : journalVoucherLineRepository.findByJournalVoucherIdIn(jvIds)) {
                    if (line.getCostCenter() != null && !line.getCostCenter().isBlank()) {
                        costCenterByJvId.putIfAbsent(line.getJournalVoucherId(), line.getCostCenter());
                    }
                }
            }

            for (JournalVoucher jv : jvs) {
                LocalDate date = jv.getDate();
                // Only needed for the single-bound case — from+to is already
                // filtered at the query level above; status=POSTED always is.
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
                dto.setCostCenter(costCenterByJvId.get(jv.getId()));
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
                Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing((d1, d2) -> {
                    Long id1 = extractId(d1.getId());
                    Long id2 = extractId(d2.getId());
                    return id2.compareTo(id1);
                }));
        return result;
    }

    private Long extractId(String idStr) {
        if (idStr == null) return 0L;
        String num = idStr.replaceAll("\\D+", "");
        try {
            return num.isEmpty() ? 0L : Long.parseLong(num);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
