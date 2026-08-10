package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.DeferredRevenueSchedule;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.Receipt;
import com.company.project.entities.SupplierBill;
import com.company.project.entities.TaxCode;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SupplierBillRepository;
import com.company.project.repositories.TaxCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * FinancialReportService — ALL reports are derived exclusively from posted
 * JournalVoucherLines joined with AccountHeads.
 *
 * This makes the system a true double-entry ERP where:
 *   Income Statement net income == change in equity on the Balance Sheet
 *   Trial Balance always balances (DR total == CR total)
 *   Cash Flow reflects real cash account movements
 *
 * Prior to this rewrite the Income Statement read from receipt_vouchers +
 * expenses tables while the Balance Sheet read from journal_voucher_lines.
 * That caused an irreconcilable disconnect between the two statements.
 */
@Service
@Transactional(readOnly = true)
public class FinancialReportService {

    private final AccountHeadRepository        accountHeadRepository;
    private final JournalVoucherRepository     journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;
    private final DeferredRevenueScheduleService deferredRevenueScheduleService;
    private final ReceiptRepository             receiptRepository;
    private final SupplierBillRepository        supplierBillRepository;
    private final TaxCodeRepository             taxCodeRepository;

    public FinancialReportService(AccountHeadRepository accountHeadRepository,
                                   JournalVoucherRepository journalVoucherRepository,
                                   JournalVoucherLineRepository journalVoucherLineRepository,
                                   DeferredRevenueScheduleService deferredRevenueScheduleService,
                                   ReceiptRepository receiptRepository,
                                   SupplierBillRepository supplierBillRepository,
                                   TaxCodeRepository taxCodeRepository) {
        this.accountHeadRepository        = accountHeadRepository;
        this.journalVoucherRepository     = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.deferredRevenueScheduleService = deferredRevenueScheduleService;
        this.receiptRepository            = receiptRepository;
        this.supplierBillRepository       = supplierBillRepository;
        this.taxCodeRepository            = taxCodeRepository;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INCOME STATEMENT (Profit & Loss)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Revenue = SUM(credit − debit) for REVENUE accounts in POSTED JVs
     *           within the period.
     * Expenses = SUM(debit − credit) for EXPENSE accounts in POSTED JVs
     *            within the period.
     * Net Income = totalRevenue − totalExpenses
     *
     * This will now automatically include:
     *   Membership payments (via ReceiptService)
     *   POS sales (via SaleTransactionService)
     *   Approved expenses (via ExpenseService)
     *   Salary payments (via SalaryPaymentService)
     *   Any manually entered POSTED journal vouchers
     */
    public Map<String, Object> getIncomeStatement(LocalDate from, LocalDate to) {
        // Collect all posted JV IDs for this period
        Set<Long> postedJvIds = getPostedJvIds(from, to);

        // Map account codes to their AccountHead (type + name)
        Map<String, AccountHead> accountMap = buildAccountMap();

        Map<String, BigDecimal> revenueByAccount  = new LinkedHashMap<>();
        Map<String, BigDecimal> expenseByAccount  = new LinkedHashMap<>();

        for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;

            String code = line.getAccountCode();
            if (code == null) continue;

            AccountHead account = accountMap.get(code);
            if (account == null) continue;

            BigDecimal debit  = safe(line.getDebit());
            BigDecimal credit = safe(line.getCredit());
            String type = account.getType() != null ? account.getType().toUpperCase() : "";
            String name = account.getName();

            switch (type) {
                case "REVENUE" ->
                    revenueByAccount.merge(name, credit.subtract(debit), BigDecimal::add);
                case "EXPENSE" ->
                    expenseByAccount.merge(name, debit.subtract(credit), BigDecimal::add);
            }
        }

        BigDecimal totalRevenue  = revenueByAccount.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpenses = expenseByAccount.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netIncome     = totalRevenue.subtract(totalExpenses);

        List<Map<String, Object>> revenueLines = toLines(revenueByAccount, false);
        List<Map<String, Object>> expenseLines = toLines(expenseByAccount, true);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from",     from);
        result.put("period_to",       to);
        result.put("total_revenue",   totalRevenue);
        result.put("total_expenses",  totalExpenses);
        result.put("net_income",      netIncome);
        result.put("revenue_lines",   revenueLines);
        result.put("expense_lines",   expenseLines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BALANCE SHEET
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Balance Sheet as of a given date.
     * Reads all POSTED JVs up to and including asOf date.
     * Balance = openingBalance + totalDebit − totalCredit per account.
     */
    public Map<String, Object> getBalanceSheet(LocalDate asOf) {
        List<AccountHead> accounts = accountHeadRepository.findAllByOrderByCodeAsc();

        Set<Long> postedJvIds = getPostedJvIds(null, asOf);

        Map<String, BigDecimal> debitByCode  = new HashMap<>();
        Map<String, BigDecimal> creditByCode = new HashMap<>();
        if (!postedJvIds.isEmpty()) {
            for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
                if (!postedJvIds.contains(line.getJournalVoucherId())) continue;
                String code = line.getAccountCode();
                if (code == null) continue;
                debitByCode.merge(code,  safe(line.getDebit()),  BigDecimal::add);
                creditByCode.merge(code, safe(line.getCredit()), BigDecimal::add);
            }
        }

        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        grouped.put("ASSET",     new ArrayList<>());
        grouped.put("LIABILITY", new ArrayList<>());
        grouped.put("EQUITY",    new ArrayList<>());
        grouped.put("REVENUE",   new ArrayList<>());
        grouped.put("EXPENSE",   new ArrayList<>());

        BigDecimal totalAssets      = BigDecimal.ZERO;
        BigDecimal totalLiabilities = BigDecimal.ZERO;
        BigDecimal totalEquity      = BigDecimal.ZERO;

        for (AccountHead a : accounts) {
            if (!Boolean.TRUE.equals(a.getIsActive())) continue;
            BigDecimal opening = safe(a.getOpeningBalance());
            BigDecimal debit   = debitByCode.getOrDefault(a.getCode(), BigDecimal.ZERO);
            BigDecimal credit  = creditByCode.getOrDefault(a.getCode(), BigDecimal.ZERO);
            BigDecimal balance = opening.add(debit).subtract(credit);

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("code",      a.getCode());
            line.put("name",      a.getName());
            line.put("sub_group", a.getSubGroup());
            line.put("balance",   balance);

            String type = a.getType() != null ? a.getType().toUpperCase() : "ASSET";
            grouped.computeIfPresent(type, (k, v) -> { v.add(line); return v; });

            if ("ASSET".equals(type))           totalAssets      = totalAssets.add(balance);
            else if ("LIABILITY".equals(type))  totalLiabilities = totalLiabilities.add(balance);
            else if ("EQUITY".equals(type))     totalEquity      = totalEquity.add(balance);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("as_of",             asOf);
        result.put("total_assets",      totalAssets);
        result.put("total_liabilities", totalLiabilities);
        result.put("total_equity",      totalEquity);
        result.put("accounts",          grouped);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TRIAL BALANCE
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> getTrialBalance(LocalDate asOf) {
        List<AccountHead> accounts = accountHeadRepository.findAllByOrderByCodeAsc();
        Set<Long> postedJvIds = getPostedJvIds(null, asOf);

        Map<String, BigDecimal> debitByCode  = new HashMap<>();
        Map<String, BigDecimal> creditByCode = new HashMap<>();
        for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;
            String code = line.getAccountCode();
            if (code == null) continue;
            debitByCode.merge(code,  safe(line.getDebit()),  BigDecimal::add);
            creditByCode.merge(code, safe(line.getCredit()), BigDecimal::add);
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal totalDebit  = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (AccountHead a : accounts) {
            BigDecimal opening = safe(a.getOpeningBalance());
            BigDecimal debit   = debitByCode.getOrDefault(a.getCode(), BigDecimal.ZERO);
            BigDecimal credit  = creditByCode.getOrDefault(a.getCode(), BigDecimal.ZERO);

            if (debit.compareTo(BigDecimal.ZERO) == 0
                    && credit.compareTo(BigDecimal.ZERO) == 0
                    && opening.compareTo(BigDecimal.ZERO) == 0) continue;

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("code",        a.getCode());
            line.put("name",        a.getName());
            line.put("type",        a.getType());
            line.put("opening_balance", opening);
            line.put("debit",       debit);
            line.put("credit",      credit);
            line.put("net_balance", opening.add(debit).subtract(credit));
            lines.add(line);

            totalDebit  = totalDebit.add(debit);
            totalCredit = totalCredit.add(credit);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("as_of",        asOf);
        result.put("total_debit",  totalDebit);
        result.put("total_credit", totalCredit);
        result.put("balanced",     totalDebit.compareTo(totalCredit) == 0);
        result.put("lines",        lines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CASH FLOW STATEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cash flow derived from movements in ASSET accounts whose name contains
     * "Cash" or "Bank" (accounts 1000 and 1001 by default).
     *
     *   Cash Inflows  = SUM(debit)  on cash/bank accounts  (money received)
     *   Cash Outflows = SUM(credit) on cash/bank accounts  (money paid out)
     *   Net Cash Flow = Inflows − Outflows
     */
    public Map<String, Object> getCashFlowStatement(LocalDate from, LocalDate to) {
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<String, AccountHead> accountMap = buildAccountMap();

        BigDecimal totalInflows  = BigDecimal.ZERO;
        BigDecimal totalOutflows = BigDecimal.ZERO;
        int inflowCount  = 0;
        int outflowCount = 0;

        for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;

            String code = line.getAccountCode();
            if (code == null) continue;

            AccountHead account = accountMap.get(code);
            if (account == null) continue;

            String type = account.getType() != null ? account.getType().toUpperCase() : "";
            String name = account.getName() != null ? account.getName().toUpperCase() : "";
            boolean isCashAccount = "ASSET".equals(type)
                    && (name.contains("CASH") || name.contains("BANK"));
            if (!isCashAccount) continue;

            BigDecimal debit  = safe(line.getDebit());
            BigDecimal credit = safe(line.getCredit());
            if (debit.compareTo(BigDecimal.ZERO) > 0) {
                totalInflows = totalInflows.add(debit);
                inflowCount++;
            }
            if (credit.compareTo(BigDecimal.ZERO) > 0) {
                totalOutflows = totalOutflows.add(credit);
                outflowCount++;
            }
        }

        BigDecimal netCashFlow = totalInflows.subtract(totalOutflows);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from",    from);
        result.put("period_to",      to);
        result.put("total_inflows",  totalInflows);
        result.put("total_outflows", totalOutflows);
        result.put("net_cash_flow",  netCashFlow);
        result.put("inflow_count",   inflowCount);
        result.put("outflow_count",  outflowCount);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  TAX SUMMARY (UAE) — VAT Return + Corporate Tax, derived from the same
    //  posted ledger lines as every other report here (no separate/mock path).
    // ─────────────────────────────────────────────────────────────────────────

    // Matches FinancialEventService.ACC_TAX_PAYABLE / ACC_GST_INPUT.
    private static final String ACC_TAX_PAYABLE = "2100";
    private static final String ACC_GST_INPUT   = "2200";

    // UAE Corporate Tax: 0% on the first AED 375,000 of taxable profit in the
    // period, 9% on the excess. No CGST/SGST/IGST split anywhere — UAE VAT is
    // a single flat rate, unlike India's GST.
    private static final BigDecimal CT_ZERO_RATE_THRESHOLD = new BigDecimal("375000");
    private static final BigDecimal CT_RATE = new BigDecimal("0.09");

    /**
     * Output VAT  = net credit movement on Tax/GST Payable (2100) in the period
     *               — VAT collected on membership, add-on, POS and invoice sales.
     * Input VAT   = net debit movement on GST Input Credit (2200) in the period
     *               — VAT paid on expenses and supplier bills, reclaimable.
     * Net VAT     = Output − Input (what's actually owed to the FTA for the period).
     * Corporate Tax reuses the same revenue/expense totals as the Income
     * Statement, so it can never drift from that report.
     */
    public Map<String, Object> getTaxSummary(LocalDate from, LocalDate to) {
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<String, AccountHead> accountMap = buildAccountMap();

        BigDecimal totalRevenue  = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal outputVat     = BigDecimal.ZERO;
        BigDecimal inputVat      = BigDecimal.ZERO;

        for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;

            String code = line.getAccountCode();
            if (code == null) continue;

            BigDecimal debit  = safe(line.getDebit());
            BigDecimal credit = safe(line.getCredit());

            if (ACC_TAX_PAYABLE.equals(code)) {
                outputVat = outputVat.add(credit.subtract(debit));
                continue;
            }
            if (ACC_GST_INPUT.equals(code)) {
                inputVat = inputVat.add(debit.subtract(credit));
                continue;
            }

            AccountHead account = accountMap.get(code);
            if (account == null) continue;
            String type = account.getType() != null ? account.getType().toUpperCase() : "";
            if ("REVENUE".equals(type)) totalRevenue = totalRevenue.add(credit.subtract(debit));
            else if ("EXPENSE".equals(type)) totalExpenses = totalExpenses.add(debit.subtract(credit));
        }

        BigDecimal netVatPayable = outputVat.subtract(inputVat);
        BigDecimal taxableProfit = totalRevenue.subtract(totalExpenses);
        BigDecimal ctTaxableBase = taxableProfit.subtract(CT_ZERO_RATE_THRESHOLD).max(BigDecimal.ZERO);
        BigDecimal corporateTaxPayable = taxableProfit.compareTo(BigDecimal.ZERO) > 0
                ? ctTaxableBase.multiply(CT_RATE).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from", from);
        result.put("period_to", to);
        result.put("total_revenue", totalRevenue);
        result.put("deductions", totalExpenses);
        result.put("taxable_profit", taxableProfit);
        result.put("corporate_tax_zero_rate_threshold", CT_ZERO_RATE_THRESHOLD);
        result.put("corporate_tax_rate", CT_RATE);
        result.put("corporate_tax_payable", corporateTaxPayable);
        result.put("output_vat", outputVat);
        result.put("input_vat", inputVat);
        result.put("net_vat_payable", netVatPayable);
        result.put("tax_by_code", getTaxByCodeBreakdown(from, to));
        return result;
    }

    /**
     * Breaks down output/input tax by each configured TaxCode's own account(s)
     * — beyond the flat 2100/2200 totals above, this surfaces CGST/SGST/IGST
     * (or any other custom tax accounts an admin has configured via TaxCode)
     * as distinct lines instead of lumping them into "VAT".
     */
    private List<Map<String, Object>> getTaxByCodeBreakdown(LocalDate from, LocalDate to) {
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<String, BigDecimal> netByAccount = new HashMap<>();
        for (JournalVoucherLine line : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;
            String code = line.getAccountCode();
            if (code == null) continue;
            netByAccount.merge(code, safe(line.getCredit()).subtract(safe(line.getDebit())), BigDecimal::add);
        }

        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (TaxCode tc : taxCodeRepository.findAll()) {
            BigDecimal outputAmount = tc.getSalesTaxAccountCode() != null
                    ? netByAccount.getOrDefault(tc.getSalesTaxAccountCode(), BigDecimal.ZERO) : BigDecimal.ZERO;
            BigDecimal inputAmount = tc.getPurchaseTaxAccountCode() != null
                    ? netByAccount.getOrDefault(tc.getPurchaseTaxAccountCode(), BigDecimal.ZERO).negate() : BigDecimal.ZERO;
            if (outputAmount.compareTo(BigDecimal.ZERO) == 0 && inputAmount.compareTo(BigDecimal.ZERO) == 0) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("tax_code", tc.getCode());
            row.put("name", tc.getName());
            row.put("tax_type", tc.getTaxType());
            row.put("output_amount", outputAmount);
            row.put("input_amount", inputAmount);
            breakdown.add(row);
        }
        return breakdown;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DEFERRED REVENUE
    // ─────────────────────────────────────────────────────────────────────────

    // Matches FinancialEventService.ACC_DEFERRED_REVENUE.
    private static final String ACC_DEFERRED_REVENUE = "2300";

    /**
     * Remaining unrecognized deferred revenue, from the ledger (2300 balance —
     * the source of truth) and from the schedule/line records (the breakdown by
     * member/plan). The two totals should always tie out to each other.
     */
    public Map<String, Object> getDeferredRevenueReport() {
        BigDecimal ledgerBalance = accountHeadRepository.findByCode(ACC_DEFERRED_REVENUE)
                .map(AccountHead::getCurrentBalance)
                .orElse(BigDecimal.ZERO);

        List<DeferredRevenueSchedule> active = deferredRevenueScheduleService.findActiveSchedules();
        BigDecimal scheduledRemaining = BigDecimal.ZERO;
        List<Map<String, Object>> scheduleLines = new ArrayList<>();
        for (DeferredRevenueSchedule s : active) {
            scheduledRemaining = scheduledRemaining.add(safe(s.getRemainingAmount()));
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("schedule_id",       s.getId());
            line.put("member_name",       s.getMemberName());
            line.put("plan_name",         s.getPlanName());
            line.put("start_date",        s.getStartDate());
            line.put("end_date",          s.getEndDate());
            line.put("total_periods",     s.getTotalPeriods());
            line.put("total_amount",      s.getTotalAmount());
            line.put("recognized_amount", s.getRecognizedAmount());
            line.put("remaining_amount",  s.getRemainingAmount());
            scheduleLines.add(line);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ledger_balance",        ledgerBalance);
        result.put("scheduled_remaining",   scheduledRemaining);
        result.put("active_schedule_count", active.size());
        result.put("schedules",             scheduleLines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CASH BOOK — chronological ledger of the Cash/Bank accounts only
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> getCashBook(LocalDate from, LocalDate to) {
        Map<Long, JournalVoucher> jvById = buildJvMap(from, to);
        Map<String, AccountHead> accountMap = buildAccountMap();

        List<JournalVoucherLine> cashLines = journalVoucherLineRepository.findAll().stream()
                .filter(l -> jvById.containsKey(l.getJournalVoucherId()))
                .filter(l -> isCashAccount(l.getAccountCode(), accountMap))
                .sorted(Comparator.comparing((JournalVoucherLine l) -> jvById.get(l.getJournalVoucherId()).getDate())
                        .thenComparing(JournalVoucherLine::getId))
                .collect(Collectors.toList());

        BigDecimal openingBalance = accountMap.values().stream()
                .filter(a -> "ASSET".equalsIgnoreCase(a.getType())
                        && a.getName() != null
                        && (a.getName().toUpperCase().contains("CASH") || a.getName().toUpperCase().contains("BANK")))
                .map(a -> safe(a.getOpeningBalance()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal running = openingBalance;
        List<Map<String, Object>> entries = new ArrayList<>();
        for (JournalVoucherLine l : cashLines) {
            JournalVoucher jv = jvById.get(l.getJournalVoucherId());
            running = running.add(safe(l.getDebit())).subtract(safe(l.getCredit()));
            entries.add(ledgerEntry(jv, l, running));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from", from);
        result.put("period_to", to);
        result.put("opening_balance", openingBalance);
        result.put("closing_balance", running);
        result.put("entries", entries);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DAY BOOK — every posted line for a single date, across all accounts
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> getDayBook(LocalDate date) {
        Map<Long, JournalVoucher> jvById = buildJvMap(date, date);

        List<Map<String, Object>> entries = journalVoucherLineRepository.findAll().stream()
                .filter(l -> jvById.containsKey(l.getJournalVoucherId()))
                .sorted(Comparator.comparing(JournalVoucherLine::getJournalVoucherId)
                        .thenComparing(JournalVoucherLine::getId))
                .map(l -> ledgerEntry(jvById.get(l.getJournalVoucherId()), l, null))
                .collect(Collectors.toList());

        BigDecimal totalDebit = entries.stream()
                .map(e -> (BigDecimal) e.get("debit")).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = entries.stream()
                .map(e -> (BigDecimal) e.get("credit")).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date);
        result.put("total_debit", totalDebit);
        result.put("total_credit", totalCredit);
        result.put("entries", entries);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GENERAL LEDGER — every account's postings + running balance, grouped
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> getGeneralLedger(LocalDate from, LocalDate to, String accountCode) {
        Map<Long, JournalVoucher> jvById = buildJvMap(from, to);
        List<AccountHead> accounts = accountHeadRepository.findAllByOrderByCodeAsc().stream()
                .filter(a -> accountCode == null || accountCode.isBlank() || accountCode.equals(a.getCode()))
                .collect(Collectors.toList());

        Map<String, List<JournalVoucherLine>> linesByAccount = journalVoucherLineRepository.findAll().stream()
                .filter(l -> jvById.containsKey(l.getJournalVoucherId()))
                .filter(l -> l.getAccountCode() != null)
                .collect(Collectors.groupingBy(JournalVoucherLine::getAccountCode));

        List<Map<String, Object>> ledgerAccounts = new ArrayList<>();
        for (AccountHead a : accounts) {
            List<JournalVoucherLine> lines = linesByAccount.getOrDefault(a.getCode(), List.of()).stream()
                    .sorted(Comparator.comparing((JournalVoucherLine l) -> jvById.get(l.getJournalVoucherId()).getDate())
                            .thenComparing(JournalVoucherLine::getId))
                    .collect(Collectors.toList());
            if (lines.isEmpty()) continue;

            BigDecimal running = safe(a.getOpeningBalance());
            List<Map<String, Object>> entries = new ArrayList<>();
            for (JournalVoucherLine l : lines) {
                running = running.add(safe(l.getDebit())).subtract(safe(l.getCredit()));
                entries.add(ledgerEntry(jvById.get(l.getJournalVoucherId()), l, running));
            }

            Map<String, Object> accEntry = new LinkedHashMap<>();
            accEntry.put("account_code", a.getCode());
            accEntry.put("account_name", a.getName());
            accEntry.put("opening_balance", safe(a.getOpeningBalance()));
            accEntry.put("closing_balance", running);
            accEntry.put("entries", entries);
            ledgerAccounts.add(accEntry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from", from);
        result.put("period_to", to);
        result.put("accounts", ledgerAccounts);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGING REPORTS — member (receivables) and supplier (payables)
    // ─────────────────────────────────────────────────────────────────────────

    private static final String[] AGING_BUCKET_LABELS = {"0-30", "31-60", "61-90", "90+"};

    public Map<String, Object> getMemberAgingReport(LocalDate asOf) {
        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal[] bucketTotals = new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};

        for (Receipt r : receiptRepository.findAll()) {
            if (!"Pending".equalsIgnoreCase(r.getStatus())) continue;
            BigDecimal outstanding = safe(r.getAmount()).subtract(safe(r.getPaidAmount()));
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate dueDate = r.getDueDate() != null ? r.getDueDate().toLocalDate() : null;
            int daysOverdue = dueDate != null ? (int) ChronoUnit.DAYS.between(dueDate, asOf) : 0;
            int bucket = agingBucketIndex(daysOverdue);
            bucketTotals[bucket] = bucketTotals[bucket].add(outstanding);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("member_name", r.getMemberName());
            row.put("receipt_no", r.getReceiptNo());
            row.put("due_date", dueDate);
            row.put("outstanding", outstanding);
            row.put("days_overdue", Math.max(daysOverdue, 0));
            row.put("bucket", AGING_BUCKET_LABELS[bucket]);
            rows.add(row);
        }

        return agingResult(asOf, rows, bucketTotals);
    }

    public Map<String, Object> getSupplierAgingReport(LocalDate asOf) {
        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal[] bucketTotals = new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};

        for (SupplierBill b : supplierBillRepository.findAll()) {
            if ("PAID".equalsIgnoreCase(b.getPaymentStatus()) || "CANCELLED".equalsIgnoreCase(b.getStatus())) continue;
            BigDecimal outstanding = safe(b.getTotalAmount()).subtract(safe(b.getAmountPaid()));
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate dueDate = b.getDueDate();
            int daysOverdue = dueDate != null ? (int) ChronoUnit.DAYS.between(dueDate, asOf) : 0;
            int bucket = agingBucketIndex(daysOverdue);
            bucketTotals[bucket] = bucketTotals[bucket].add(outstanding);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("supplier_name", b.getSupplierName());
            row.put("bill_number", b.getBillNumber());
            row.put("due_date", dueDate);
            row.put("outstanding", outstanding);
            row.put("days_overdue", Math.max(daysOverdue, 0));
            row.put("bucket", AGING_BUCKET_LABELS[bucket]);
            rows.add(row);
        }

        return agingResult(asOf, rows, bucketTotals);
    }

    private static int agingBucketIndex(int daysOverdue) {
        if (daysOverdue <= 30) return 0;
        if (daysOverdue <= 60) return 1;
        if (daysOverdue <= 90) return 2;
        return 3;
    }

    private static Map<String, Object> agingResult(LocalDate asOf, List<Map<String, Object>> rows, BigDecimal[] bucketTotals) {
        Map<String, Object> buckets = new LinkedHashMap<>();
        for (int i = 0; i < AGING_BUCKET_LABELS.length; i++) {
            buckets.put(AGING_BUCKET_LABELS[i], bucketTotals[i]);
        }
        BigDecimal total = Arrays.stream(bucketTotals).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("as_of", asOf);
        result.put("total_outstanding", total);
        result.put("buckets", buckets);
        result.put("rows", rows);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the set of POSTED JournalVoucher IDs whose date falls within
     * [from, to]. Null bounds are treated as open-ended.
     */
    private Set<Long> getPostedJvIds(LocalDate from, LocalDate to) {
        return journalVoucherRepository.findByStatusOrderByDateDesc("POSTED")
                .stream()
                .filter(jv -> {
                    if (jv.getDate() == null) return false;
                    if (from != null && jv.getDate().isBefore(from)) return false;
                    if (to   != null && jv.getDate().isAfter(to))   return false;
                    return true;
                })
                .map(JournalVoucher::getId)
                .collect(Collectors.toSet());
    }

    /** Posted JournalVouchers within [from, to], keyed by id — backs the ledger-style reports. */
    private Map<Long, JournalVoucher> buildJvMap(LocalDate from, LocalDate to) {
        return journalVoucherRepository.findByStatusOrderByDateDesc("POSTED").stream()
                .filter(jv -> {
                    if (jv.getDate() == null) return false;
                    if (from != null && jv.getDate().isBefore(from)) return false;
                    if (to   != null && jv.getDate().isAfter(to))   return false;
                    return true;
                })
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));
    }

    private static boolean isCashAccount(String code, Map<String, AccountHead> accountMap) {
        AccountHead account = accountMap.get(code);
        if (account == null) return false;
        String type = account.getType() != null ? account.getType().toUpperCase() : "";
        String name = account.getName() != null ? account.getName().toUpperCase() : "";
        return "ASSET".equals(type) && (name.contains("CASH") || name.contains("BANK"));
    }

    /** One ledger-report row for a JournalVoucherLine — runningBalance is null where not applicable (Day Book). */
    private static Map<String, Object> ledgerEntry(JournalVoucher jv, JournalVoucherLine line, BigDecimal runningBalance) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("date", jv.getDate());
        entry.put("voucher_no", jv.getVoucherNo());
        entry.put("narration", line.getDescription() != null ? line.getDescription() : jv.getNarration());
        entry.put("account_code", line.getAccountCode());
        entry.put("account_name", line.getAccountName());
        entry.put("debit", safe(line.getDebit()));
        entry.put("credit", safe(line.getCredit()));
        if (runningBalance != null) entry.put("running_balance", runningBalance);
        return entry;
    }

    /** Builds a code → AccountHead lookup map for fast line-level joins. */
    private Map<String, AccountHead> buildAccountMap() {
        return accountHeadRepository.findAllByOrderByCodeAsc()
                .stream()
                .filter(a -> a.getCode() != null)
                .collect(Collectors.toMap(AccountHead::getCode, a -> a, (a, b) -> a));
    }

    private static List<Map<String, Object>> toLines(Map<String, BigDecimal> map, boolean negateAmount) {
        return map.entrySet().stream().map(e -> {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("account_name", e.getKey());
            line.put("amount", negateAmount ? e.getValue().negate() : e.getValue());
            return line;
        }).collect(Collectors.toList());
    }

    private static BigDecimal safe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
