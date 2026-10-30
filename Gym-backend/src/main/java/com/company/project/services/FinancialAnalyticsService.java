package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.TaxComplianceRepository;
import com.company.project.repositories.SupplierBillRepository;
import com.company.project.repositories.BankReconciliationRepository;
import com.company.project.entities.SupplierBill;
import com.company.project.entities.BankReconciliation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * FinancialAnalyticsService — dashboard KPIs and trend data.
 *
 * All revenue and expense figures are derived from POSTED JournalVoucherLines,
 * ensuring the dashboard numbers are always consistent with the Income Statement
 * and Balance Sheet reports.
 *
 * Previously this read from receipt_vouchers and expenses tables, which caused
 * the dashboard to show different totals than FinancialReportService.
 */
@Service
@Transactional(readOnly = true)
public class FinancialAnalyticsService {

    private final AccountHeadRepository        accountHeadRepository;
    private final JournalVoucherRepository     journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;
    private final TaxComplianceRepository      taxComplianceRepository;
    private final SupplierBillRepository       supplierBillRepository;
    private final BankReconciliationRepository bankReconciliationRepository;

    public FinancialAnalyticsService(AccountHeadRepository accountHeadRepository,
                                      JournalVoucherRepository journalVoucherRepository,
                                      JournalVoucherLineRepository journalVoucherLineRepository,
                                      TaxComplianceRepository taxComplianceRepository,
                                      SupplierBillRepository supplierBillRepository,
                                      BankReconciliationRepository bankReconciliationRepository) {
        this.accountHeadRepository        = accountHeadRepository;
        this.journalVoucherRepository     = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.taxComplianceRepository      = taxComplianceRepository;
        this.supplierBillRepository       = supplierBillRepository;
        this.bankReconciliationRepository = bankReconciliationRepository;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DASHBOARD KPIs  (all-time totals from POSTED journal entries)
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> getDashboard() {
        Map<String, AccountHead> accountMap = buildAccountMap();

        BigDecimal totalRevenue  = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;

        for (Object[] row : journalVoucherLineRepository.sumPostedByAccount()) {
            AccountHead acc = row[0] == null ? null : accountMap.get((String) row[0]);
            if (acc == null) continue;

            String type = acc.getType() != null ? acc.getType().toUpperCase() : "";
            BigDecimal debit  = decimal(row[1]);
            BigDecimal credit = decimal(row[2]);

            if ("REVENUE".equals(type))  totalRevenue  = totalRevenue .add(credit.subtract(debit));
            if ("EXPENSE".equals(type))  totalExpenses = totalExpenses.add(debit.subtract(credit));
        }

        BigDecimal netIncome    = totalRevenue.subtract(totalExpenses);
        BigDecimal profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netIncome.divide(totalRevenue, 4, RoundingMode.HALF_UP)
                           .multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        long pendingTaxCount = taxComplianceRepository.findByStatusOrderByDueDateDesc("PENDING").size()
                + taxComplianceRepository.findByStatusOrderByDueDateDesc("OVERDUE").size();
                
        BigDecimal outstandingPayments = supplierBillRepository.findAll().stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()) && !"PAID".equals(b.getPaymentStatus()))
                .map(b -> safe(b.getTotalAmount()).subtract(safe(b.getAmountPaid())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        long pendingReconciliations = bankReconciliationRepository.findAll().stream()
                .filter(r -> "OPEN".equals(r.getStatus()) || "IN_PROGRESS".equals(r.getStatus()))
                .count();

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("total_revenue",          totalRevenue);
        dashboard.put("total_expenses",         totalExpenses);
        dashboard.put("net_income",             netIncome);
        dashboard.put("profit_margin",          profitMargin.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("pending_tax_obligations", pendingTaxCount);
        dashboard.put("outstanding_payments", outstandingPayments);
        dashboard.put("pending_reconciliations", pendingReconciliations);
        return dashboard;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MONTHLY TREND  (revenue vs expenses by calendar month)
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getMonthlyTrend(int months) {
        LocalDate to   = LocalDate.now();
        LocalDate from = to.minusMonths(months).withDayOfMonth(1);

        Map<String, AccountHead> accountMap = buildAccountMap();

        // key = "YYYY-MM"
        Map<String, BigDecimal> revenueByMonth  = new LinkedHashMap<>();
        Map<String, BigDecimal> expenseByMonth  = new LinkedHashMap<>();

        // Pre-fill all months with zero
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            String key = cursor.getYear() + "-" + String.format("%02d", cursor.getMonthValue());
            revenueByMonth.put(key, BigDecimal.ZERO);
            expenseByMonth.put(key, BigDecimal.ZERO);
            cursor = cursor.plusMonths(1);
        }

        for (Object[] row : journalVoucherLineRepository.sumPostedByAccountAndMonth(from, to)) {
            AccountHead acc = row[0] == null ? null : accountMap.get((String) row[0]);
            if (acc == null) continue;

            String type = acc.getType() != null ? acc.getType().toUpperCase() : "";
            String key  = ((Number) row[1]).intValue() + "-" + String.format("%02d", ((Number) row[2]).intValue());

            BigDecimal debit  = decimal(row[3]);
            BigDecimal credit = decimal(row[4]);

            if ("REVENUE".equals(type) && revenueByMonth.containsKey(key)) {
                revenueByMonth.merge(key, credit.subtract(debit), BigDecimal::add);
            }
            if ("EXPENSE".equals(type) && expenseByMonth.containsKey(key)) {
                expenseByMonth.merge(key, debit.subtract(credit), BigDecimal::add);
            }
        }

        // Build output list
        List<Map<String, Object>> trend = new ArrayList<>();
        for (String key : revenueByMonth.keySet()) {
            BigDecimal rev = revenueByMonth.getOrDefault(key, BigDecimal.ZERO);
            BigDecimal exp = expenseByMonth.getOrDefault(key, BigDecimal.ZERO);
            String[] parts = key.split("-");
            String label = java.time.Month.of(Integer.parseInt(parts[1])).name().substring(0, 3)
                    + " " + parts[0];
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("month",    label);
            point.put("period",   key);
            point.put("revenue",  rev);
            point.put("expenses", exp);
            point.put("profit",   rev.subtract(exp));
            trend.add(point);
        }
        return trend;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REVENUE BREAKDOWN BY ACCOUNT NAME
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getRevenueBySource() {
        Map<String, AccountHead> accountMap = buildAccountMap();

        Map<String, BigDecimal> bySource = new LinkedHashMap<>();
        for (Object[] row : postedTotalsByCode()) {
            String code = (String) row[0];
            AccountHead acc = accountMap.get(code);
            if (acc == null || !"REVENUE".equals(acc.getType() != null ? acc.getType().toUpperCase() : "")) continue;

            String name   = acc.getName() != null ? acc.getName() : code;
            BigDecimal cr = decimal(row[2]).subtract(decimal(row[1]));
            bySource.merge(name, cr, BigDecimal::add);
        }

        return bySource.entrySet().stream().map(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("source", e.getKey());
            item.put("amount", e.getValue());
            return item;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EXPENSE BREAKDOWN BY ACCOUNT NAME
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getExpenseByCategory() {
        Map<String, AccountHead> accountMap = buildAccountMap();

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        for (Object[] row : postedTotalsByCode()) {
            String code = (String) row[0];
            AccountHead acc = accountMap.get(code);
            if (acc == null || !"EXPENSE".equals(acc.getType() != null ? acc.getType().toUpperCase() : "")) continue;

            String name   = acc.getName() != null ? acc.getName() : code;
            BigDecimal dr = decimal(row[1]).subtract(decimal(row[2]));
            byCategory.merge(name, dr, BigDecimal::add);
        }

        return byCategory.entrySet().stream().map(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("category", e.getKey());
            item.put("amount",   e.getValue());
            return item;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  OUTSTANDING SUPPLIER PAYMENTS  (unpaid/partial bills, most overdue first)
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getOutstandingPayments() {
        LocalDate today = LocalDate.now();
        return supplierBillRepository.findAll().stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()) && !"PAID".equals(b.getPaymentStatus()))
                .map(b -> {
                    BigDecimal balance = safe(b.getTotalAmount()).subtract(safe(b.getAmountPaid()));
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", b.getId());
                    item.put("vendor", b.getSupplierName());
                    item.put("description", b.getBillNumber() != null ? b.getBillNumber() : b.getInvoiceNumber());
                    item.put("amount", balance);
                    item.put("dueDate", b.getDueDate());
                    item.put("overdue", b.getDueDate() != null && b.getDueDate().isBefore(today));
                    return item;
                })
                .sorted((a, b) -> {
                    LocalDate da = (LocalDate) a.get("dueDate");
                    LocalDate db = (LocalDate) b.get("dueDate");
                    if (da == null) return 1;
                    if (db == null) return -1;
                    return da.compareTo(db);
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PENDING BANK RECONCILIATIONS  (OPEN / IN_PROGRESS statements)
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getPendingReconciliations() {
        return bankReconciliationRepository.findAllByOrderByStatementDateDesc().stream()
                .filter(r -> "OPEN".equals(r.getStatus()) || "IN_PROGRESS".equals(r.getStatus()))
                .map(r -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", r.getId());
                    item.put("account", r.getBankAccountName());
                    item.put("bank", r.getBankAccountName());
                    item.put("lastReconciled", r.getStatementDate());
                    item.put("difference", safe(r.getDifference()));
                    item.put("status", r.getStatus());
                    return item;
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Posted [accountCode, debit, credit] totals, in account-code order so breakdowns list stably. */
    private List<Object[]> postedTotalsByCode() {
        return journalVoucherLineRepository.sumPostedByAccount().stream()
                .filter(row -> row[0] != null)
                .sorted(Comparator.comparing(row -> (String) row[0]))
                .collect(Collectors.toList());
    }

    private static BigDecimal decimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        return v instanceof BigDecimal b ? b : new BigDecimal(v.toString());
    }

    private Map<String, AccountHead> buildAccountMap() {
        return accountHeadRepository.findAllByOrderByCodeAsc().stream()
                .filter(a -> a.getCode() != null)
                .collect(Collectors.toMap(AccountHead::getCode, a -> a, (a, b) -> a));
    }

    private static BigDecimal safe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
