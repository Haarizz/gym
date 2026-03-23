package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.Expense;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.ExpenseRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class FinancialReportService {

    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final ExpenseRepository expenseRepository;
    private final AccountHeadRepository accountHeadRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;

    public FinancialReportService(ReceiptVoucherRepository receiptVoucherRepository,
                                   ExpenseRepository expenseRepository,
                                   AccountHeadRepository accountHeadRepository,
                                   JournalVoucherRepository journalVoucherRepository,
                                   JournalVoucherLineRepository journalVoucherLineRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.expenseRepository = expenseRepository;
        this.accountHeadRepository = accountHeadRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
    }

    public Map<String, Object> getIncomeStatement(LocalDate from, LocalDate to) {
        // Revenue: completed receipt vouchers grouped by sourceCategory
        List<ReceiptVoucher> vouchers = receiptVoucherRepository.findByDateBetweenOrderByDateDesc(from, to)
                .stream().filter(rv -> "completed".equalsIgnoreCase(rv.getStatus()))
                .collect(Collectors.toList());

        Map<String, BigDecimal> revenueByCategory = new LinkedHashMap<>();
        for (ReceiptVoucher rv : vouchers) {
            String cat = rv.getSourceCategory() != null ? rv.getSourceCategory() : "Other Revenue";
            revenueByCategory.merge(cat, rv.getAmount() != null ? rv.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal totalRevenue = revenueByCategory.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        // Expenses: approved expenses grouped by category
        List<Expense> expenses = expenseRepository.findByDateBetweenOrderByDateDesc(from, to)
                .stream().filter(e -> "approved".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());

        Map<String, BigDecimal> expenseByCategory = new LinkedHashMap<>();
        for (Expense e : expenses) {
            String cat = e.getCategory() != null ? e.getCategory() : "Other Expense";
            expenseByCategory.merge(cat, e.getTotalAmount() != null ? e.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal totalExpenses = expenseByCategory.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netIncome = totalRevenue.subtract(totalExpenses);

        List<Map<String, Object>> revenueLines = revenueByCategory.entrySet().stream().map(entry -> {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("account_name", entry.getKey());
            line.put("amount", entry.getValue());
            return line;
        }).collect(Collectors.toList());

        List<Map<String, Object>> expenseLines = expenseByCategory.entrySet().stream().map(entry -> {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("account_name", entry.getKey());
            line.put("amount", entry.getValue().negate());
            return line;
        }).collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from", from);
        result.put("period_to", to);
        result.put("total_revenue", totalRevenue);
        result.put("total_expenses", totalExpenses);
        result.put("net_income", netIncome);
        result.put("revenue_lines", revenueLines);
        result.put("expense_lines", expenseLines);
        return result;
    }

    public Map<String, Object> getBalanceSheet(LocalDate asOf) {
        List<AccountHead> accounts = accountHeadRepository.findAllByOrderByCodeAsc();

        Map<String, List<Map<String, Object>>> grouped = new LinkedHashMap<>();
        grouped.put("ASSET", new ArrayList<>());
        grouped.put("LIABILITY", new ArrayList<>());
        grouped.put("EQUITY", new ArrayList<>());
        grouped.put("REVENUE", new ArrayList<>());
        grouped.put("EXPENSE", new ArrayList<>());

        BigDecimal totalAssets = BigDecimal.ZERO;
        BigDecimal totalLiabilities = BigDecimal.ZERO;
        BigDecimal totalEquity = BigDecimal.ZERO;

        for (AccountHead a : accounts) {
            if (!Boolean.TRUE.equals(a.getIsActive())) continue;
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("code", a.getCode());
            line.put("name", a.getName());
            line.put("sub_group", a.getSubGroup());
            line.put("balance", a.getCurrentBalance() != null ? a.getCurrentBalance() : BigDecimal.ZERO);
            String type = a.getType() != null ? a.getType().toUpperCase() : "ASSET";
            if (grouped.containsKey(type)) {
                grouped.get(type).add(line);
            }
            BigDecimal bal = a.getCurrentBalance() != null ? a.getCurrentBalance() : BigDecimal.ZERO;
            if ("ASSET".equals(type)) totalAssets = totalAssets.add(bal);
            else if ("LIABILITY".equals(type)) totalLiabilities = totalLiabilities.add(bal);
            else if ("EQUITY".equals(type)) totalEquity = totalEquity.add(bal);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("as_of", asOf);
        result.put("total_assets", totalAssets);
        result.put("total_liabilities", totalLiabilities);
        result.put("total_equity", totalEquity);
        result.put("accounts", grouped);
        return result;
    }

    public Map<String, Object> getTrialBalance(LocalDate asOf) {
        List<AccountHead> accounts = accountHeadRepository.findAllByOrderByCodeAsc();

        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (AccountHead a : accounts) {
            BigDecimal debit = BigDecimal.ZERO;
            BigDecimal credit = BigDecimal.ZERO;

            List<JournalVoucherLine> jvLines = journalVoucherLineRepository.findByAccountCode(a.getCode());
            for (JournalVoucherLine line : jvLines) {
                Optional<JournalVoucher> jv = journalVoucherRepository.findById(line.getJournalVoucherId());
                if (jv.isEmpty() || !"POSTED".equalsIgnoreCase(jv.get().getStatus())) continue;
                if (asOf != null && jv.get().getDate().isAfter(asOf)) continue;
                debit = debit.add(line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO);
                credit = credit.add(line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO);
            }

            if (debit.compareTo(BigDecimal.ZERO) != 0 || credit.compareTo(BigDecimal.ZERO) != 0
                    || (a.getOpeningBalance() != null && a.getOpeningBalance().compareTo(BigDecimal.ZERO) != 0)) {
                BigDecimal opening = a.getOpeningBalance() != null ? a.getOpeningBalance() : BigDecimal.ZERO;
                Map<String, Object> line = new LinkedHashMap<>();
                line.put("code", a.getCode());
                line.put("name", a.getName());
                line.put("type", a.getType());
                line.put("opening_balance", opening);
                line.put("debit", debit);
                line.put("credit", credit);
                line.put("net_balance", opening.add(debit).subtract(credit));
                lines.add(line);
                totalDebit = totalDebit.add(debit);
                totalCredit = totalCredit.add(credit);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("as_of", asOf);
        result.put("total_debit", totalDebit);
        result.put("total_credit", totalCredit);
        result.put("lines", lines);
        return result;
    }

    public Map<String, Object> getCashFlowStatement(LocalDate from, LocalDate to) {
        // Inflows: completed receipt vouchers
        List<ReceiptVoucher> inflows = receiptVoucherRepository.findByDateBetweenOrderByDateDesc(from, to)
                .stream().filter(rv -> "completed".equalsIgnoreCase(rv.getStatus()))
                .collect(Collectors.toList());
        BigDecimal totalInflows = inflows.stream()
                .map(rv -> rv.getAmount() != null ? rv.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Outflows: approved expenses
        List<Expense> outflows = expenseRepository.findByDateBetweenOrderByDateDesc(from, to)
                .stream().filter(e -> "approved".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());
        BigDecimal totalOutflows = outflows.stream()
                .map(e -> e.getTotalAmount() != null ? e.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCashFlow = totalInflows.subtract(totalOutflows);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period_from", from);
        result.put("period_to", to);
        result.put("total_inflows", totalInflows);
        result.put("total_outflows", totalOutflows);
        result.put("net_cash_flow", netCashFlow);
        result.put("inflow_count", inflows.size());
        result.put("outflow_count", outflows.size());
        return result;
    }
}
