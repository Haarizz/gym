package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.PaymentVoucher;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.PaymentVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
    private final PaymentVoucherRepository     paymentVoucherRepository;

    public FinancialReportService(AccountHeadRepository accountHeadRepository,
                                   JournalVoucherRepository journalVoucherRepository,
                                   JournalVoucherLineRepository journalVoucherLineRepository,
                                   PaymentVoucherRepository paymentVoucherRepository) {
        this.accountHeadRepository        = accountHeadRepository;
        this.journalVoucherRepository     = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.paymentVoucherRepository     = paymentVoucherRepository;
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
    //  DAY BOOK (General Ledger)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Chronological list of all POSTED JV lines within [from, to].
     * Optionally filtered by accountCode.
     * Includes a running balance per account.
     */
    public Map<String, Object> getDayBook(LocalDate from, LocalDate to, String accountCode) {
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<String, AccountHead> accountMap = buildAccountMap();

        // Build JV date lookup
        Map<Long, JournalVoucher> jvById = journalVoucherRepository
                .findByStatusOrderByDateDesc("POSTED")
                .stream()
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal runningBalance = BigDecimal.ZERO;

        // Collect and sort lines by date then voucher id
        List<JournalVoucherLine> filtered = journalVoucherLineRepository.findAll()
                .stream()
                .filter(l -> postedJvIds.contains(l.getJournalVoucherId()))
                .filter(l -> accountCode == null || accountCode.isBlank()
                        || accountCode.equalsIgnoreCase(l.getAccountCode()))
                .sorted(Comparator
                        .comparing((JournalVoucherLine l) -> {
                            JournalVoucher jv = jvById.get(l.getJournalVoucherId());
                            return jv != null && jv.getDate() != null ? jv.getDate() : LocalDate.MIN;
                        })
                        .thenComparing(l -> l.getJournalVoucherId()))
                .collect(Collectors.toList());

        for (JournalVoucherLine l : filtered) {
            JournalVoucher jv = jvById.get(l.getJournalVoucherId());
            if (jv == null) continue;
            BigDecimal debit  = safe(l.getDebit());
            BigDecimal credit = safe(l.getCredit());
            runningBalance = runningBalance.add(debit).subtract(credit);

            AccountHead acc = accountMap.get(l.getAccountCode());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date",          jv.getDate());
            row.put("voucher_no",    jv.getVoucherNo());
            row.put("narration",     jv.getNarration());
            row.put("account_code",  l.getAccountCode());
            row.put("account_name",  acc != null ? acc.getName() : l.getAccountName());
            row.put("account_type",  acc != null ? acc.getType() : null);
            row.put("debit",         debit);
            row.put("credit",        credit);
            row.put("balance",       runningBalance);
            lines.add(row);
        }

        BigDecimal totalDebit  = filtered.stream().map(l -> safe(l.getDebit())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = filtered.stream().map(l -> safe(l.getCredit())).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from",   from);
        result.put("period_to",     to);
        result.put("account_code",  accountCode);
        result.put("total_debit",   totalDebit);
        result.put("total_credit",  totalCredit);
        result.put("lines",         lines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BANK BOOK
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Shows only movements in Cash and Bank ASSET accounts.
     * Each row represents a JV line on a cash/bank account with a running balance.
     */
    public Map<String, Object> getBankBook(LocalDate from, LocalDate to) {
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<String, AccountHead> accountMap = buildAccountMap();

        Map<Long, JournalVoucher> jvById = journalVoucherRepository
                .findByStatusOrderByDateDesc("POSTED")
                .stream()
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));

        // Opening balance = all ASSET cash/bank movements BEFORE from
        BigDecimal openingBalance = BigDecimal.ZERO;
        if (from != null) {
            Set<Long> preFromIds = journalVoucherRepository.findByStatusOrderByDateDesc("POSTED")
                    .stream()
                    .filter(jv -> jv.getDate() != null && jv.getDate().isBefore(from))
                    .map(JournalVoucher::getId)
                    .collect(Collectors.toSet());
            for (JournalVoucherLine l : journalVoucherLineRepository.findAll()) {
                if (!preFromIds.contains(l.getJournalVoucherId())) continue;
                AccountHead acc = accountMap.get(l.getAccountCode());
                if (!isCashOrBank(acc)) continue;
                openingBalance = openingBalance.add(safe(l.getDebit())).subtract(safe(l.getCredit()));
            }
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal runningBalance = openingBalance;

        List<JournalVoucherLine> filtered = journalVoucherLineRepository.findAll()
                .stream()
                .filter(l -> postedJvIds.contains(l.getJournalVoucherId()))
                .filter(l -> isCashOrBank(accountMap.get(l.getAccountCode())))
                .sorted(Comparator
                        .comparing((JournalVoucherLine l) -> {
                            JournalVoucher jv = jvById.get(l.getJournalVoucherId());
                            return jv != null && jv.getDate() != null ? jv.getDate() : LocalDate.MIN;
                        })
                        .thenComparing(l -> l.getJournalVoucherId()))
                .collect(Collectors.toList());

        for (JournalVoucherLine l : filtered) {
            JournalVoucher jv = jvById.get(l.getJournalVoucherId());
            if (jv == null) continue;
            BigDecimal debit  = safe(l.getDebit());
            BigDecimal credit = safe(l.getCredit());
            runningBalance = runningBalance.add(debit).subtract(credit);

            AccountHead acc = accountMap.get(l.getAccountCode());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date",         jv.getDate());
            row.put("voucher_no",   jv.getVoucherNo());
            row.put("narration",    jv.getNarration());
            row.put("account_name", acc != null ? acc.getName() : l.getAccountName());
            row.put("inflow",       debit);
            row.put("outflow",      credit);
            row.put("balance",      runningBalance);
            lines.add(row);
        }

        BigDecimal totalInflows  = filtered.stream().map(l -> safe(l.getDebit())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOutflows = filtered.stream().map(l -> safe(l.getCredit())).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from",     from);
        result.put("period_to",       to);
        result.put("opening_balance", openingBalance);
        result.put("closing_balance", runningBalance);
        result.put("total_inflows",   totalInflows);
        result.put("total_outflows",  totalOutflows);
        result.put("lines",           lines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUND FLOW STATEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fund Flow Statement — Sources and Uses of Working Capital.
     *
     * Working Capital = Current Assets − Current Liabilities
     * (accounts whose subGroup contains "Current" or is null for ASSET/LIABILITY types)
     *
     * Sources of funds:
     *   • Net income from operations
     *   • Long-term financing (new JV credits on EQUITY / non-current LIABILITY accounts)
     *
     * Uses of funds:
     *   • Net loss (if net income negative)
     *   • Capital expenditure (debits to non-current ASSET accounts)
     *   • Dividends / drawings (credits to EQUITY accounts)
     */
    public Map<String, Object> getFundFlowStatement(LocalDate from, LocalDate to) {
        Map<String, AccountHead> accountMap = buildAccountMap();
        Set<Long> postedJvIds = getPostedJvIds(from, to);
        Map<Long, JournalVoucher> jvById = journalVoucherRepository
                .findByStatusOrderByDateDesc("POSTED")
                .stream()
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));

        // Accumulators
        BigDecimal netIncome       = BigDecimal.ZERO;
        BigDecimal longTermSources = BigDecimal.ZERO;
        BigDecimal longTermUses    = BigDecimal.ZERO;
        BigDecimal wcChangeCA      = BigDecimal.ZERO; // current assets net change
        BigDecimal wcChangeCL      = BigDecimal.ZERO; // current liabilities net change

        List<Map<String, Object>> sourceLines = new ArrayList<>();
        List<Map<String, Object>> useLines    = new ArrayList<>();

        // Compute per-account net movements
        Map<String, BigDecimal> netByAccount = new LinkedHashMap<>();
        for (JournalVoucherLine l : journalVoucherLineRepository.findAll()) {
            if (!postedJvIds.contains(l.getJournalVoucherId())) continue;
            String code = l.getAccountCode();
            if (code == null) continue;
            BigDecimal net = safe(l.getDebit()).subtract(safe(l.getCredit()));
            netByAccount.merge(code, net, BigDecimal::add);
        }

        for (Map.Entry<String, BigDecimal> entry : netByAccount.entrySet()) {
            AccountHead acc = accountMap.get(entry.getKey());
            if (acc == null) continue;
            BigDecimal net  = entry.getValue();
            String type     = acc.getType() != null ? acc.getType().toUpperCase() : "";
            String subGroup = acc.getSubGroup() != null ? acc.getSubGroup().toUpperCase() : "";
            boolean isCurrent = subGroup.contains("CURRENT") || subGroup.isBlank();

            switch (type) {
                case "REVENUE":
                    // credit net = revenue earned
                    netIncome = netIncome.add(net.negate());
                    break;
                case "EXPENSE":
                    netIncome = netIncome.subtract(net);
                    break;
                case "ASSET":
                    if (isCurrent) {
                        // increase in CA = use of funds; decrease = source
                        wcChangeCA = wcChangeCA.add(net);
                    } else {
                        // Capex (debit to non-current asset) = use
                        if (net.compareTo(BigDecimal.ZERO) > 0) {
                            longTermUses = longTermUses.add(net);
                            Map<String, Object> u = new LinkedHashMap<>();
                            u.put("description", "Capital Expenditure – " + acc.getName());
                            u.put("amount", net);
                            useLines.add(u);
                        } else if (net.compareTo(BigDecimal.ZERO) < 0) {
                            // disposal / decrease = source
                            longTermSources = longTermSources.add(net.negate());
                            Map<String, Object> s = new LinkedHashMap<>();
                            s.put("description", "Asset Disposal – " + acc.getName());
                            s.put("amount", net.negate());
                            sourceLines.add(s);
                        }
                    }
                    break;
                case "LIABILITY":
                    if (isCurrent) {
                        wcChangeCL = wcChangeCL.add(net.negate());
                    } else {
                        // New long-term borrowing (credit = source)
                        if (net.compareTo(BigDecimal.ZERO) < 0) {
                            longTermSources = longTermSources.add(net.negate());
                            Map<String, Object> s = new LinkedHashMap<>();
                            s.put("description", "Long-term Financing – " + acc.getName());
                            s.put("amount", net.negate());
                            sourceLines.add(s);
                        } else {
                            longTermUses = longTermUses.add(net);
                            Map<String, Object> u = new LinkedHashMap<>();
                            u.put("description", "Loan Repayment – " + acc.getName());
                            u.put("amount", net);
                            useLines.add(u);
                        }
                    }
                    break;
                case "EQUITY":
                    if (net.compareTo(BigDecimal.ZERO) < 0) {
                        longTermSources = longTermSources.add(net.negate());
                        Map<String, Object> s = new LinkedHashMap<>();
                        s.put("description", "Capital Injection – " + acc.getName());
                        s.put("amount", net.negate());
                        sourceLines.add(s);
                    } else {
                        longTermUses = longTermUses.add(net);
                        Map<String, Object> u = new LinkedHashMap<>();
                        u.put("description", "Drawings / Dividends – " + acc.getName());
                        u.put("amount", net);
                        useLines.add(u);
                    }
                    break;
            }
        }

        // Net working capital change
        BigDecimal wcChange = wcChangeCL.subtract(wcChangeCA); // positive = increase in WC

        // Add net income as first source/use
        if (netIncome.compareTo(BigDecimal.ZERO) >= 0) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("description", "Net Income from Operations");
            s.put("amount", netIncome);
            sourceLines.add(0, s);
        } else {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("description", "Net Loss from Operations");
            u.put("amount", netIncome.negate());
            useLines.add(0, u);
        }

        BigDecimal totalSources = sourceLines.stream()
                .map(m -> (BigDecimal) m.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalUses    = useLines.stream()
                .map(m -> (BigDecimal) m.get("amount")).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from",               from);
        result.put("period_to",                 to);
        result.put("net_income",                netIncome);
        result.put("working_capital_change",    wcChange);
        result.put("total_sources",             totalSources);
        result.put("total_uses",                totalUses);
        result.put("net_fund_flow",             totalSources.subtract(totalUses));
        result.put("sources",                   sourceLines);
        result.put("uses",                      useLines);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PDC REPORT (Post-Dated Cheques)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns outgoing post-dated cheques from PaymentVouchers where
     * paymentMethod = "Cheque" (case-insensitive).
     * When status param is "pending", only future cheques (chequeDate >= today) are returned.
     */
    public Map<String, Object> getPdcReport(String status) {
        LocalDate today = LocalDate.now();
        List<PaymentVoucher> all = paymentVoucherRepository.findAllByOrderByPaymentDateDesc();

        List<Map<String, Object>> outgoing = new ArrayList<>();
        BigDecimal totalOutgoing = BigDecimal.ZERO;

        for (PaymentVoucher pv : all) {
            boolean isCheque = "cheque".equalsIgnoreCase(pv.getPaymentMethod());
            if (!isCheque) continue;

            boolean isPostDated = pv.getChequeDate() != null && !pv.getChequeDate().isBefore(today);
            if ("pending".equalsIgnoreCase(status) && !isPostDated) continue;

            BigDecimal amt = pv.getAmount() != null ? pv.getAmount() : BigDecimal.ZERO;
            totalOutgoing = totalOutgoing.add(amt);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("type",          "Outgoing");
            row.put("voucher_no",    pv.getVoucherNo());
            row.put("party_name",    pv.getSupplierName());
            row.put("cheque_no",     pv.getChequeNo());
            row.put("cheque_date",   pv.getChequeDate());
            row.put("payment_date",  pv.getPaymentDate());
            row.put("bank_account",  pv.getBankAccount());
            row.put("amount",        amt);
            row.put("status",        pv.getStatus());
            row.put("is_post_dated", isPostDated);
            outgoing.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("report_date",    today);
        result.put("status_filter",  status);
        result.put("total_outgoing", totalOutgoing);
        result.put("outgoing_count", outgoing.size());
        result.put("cheques",        outgoing);
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

    private static boolean isCashOrBank(AccountHead acc) {
        if (acc == null) return false;
        String type = acc.getType() != null ? acc.getType().toUpperCase() : "";
        String name = acc.getName() != null ? acc.getName().toUpperCase() : "";
        return "ASSET".equals(type) && (name.contains("CASH") || name.contains("BANK"));
    }
}
