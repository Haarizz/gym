package com.company.project.services;

import com.company.project.repositories.ExpenseRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import com.company.project.repositories.TaxComplianceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class FinancialAnalyticsService {

    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final ExpenseRepository expenseRepository;
    private final TaxComplianceRepository taxComplianceRepository;

    public FinancialAnalyticsService(ReceiptVoucherRepository receiptVoucherRepository,
                                      ExpenseRepository expenseRepository,
                                      TaxComplianceRepository taxComplianceRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.expenseRepository = expenseRepository;
        this.taxComplianceRepository = taxComplianceRepository;
    }

    public Map<String, Object> getDashboard() {
        BigDecimal totalRevenue = receiptVoucherRepository.sumCompleted();
        BigDecimal totalExpenses = expenseRepository.sumApprovedTotal();
        BigDecimal netIncome = totalRevenue.subtract(totalExpenses);
        BigDecimal profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netIncome.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        long pendingTaxCount = taxComplianceRepository.findByStatusOrderByDueDateDesc("PENDING").size()
                + taxComplianceRepository.findByStatusOrderByDueDateDesc("OVERDUE").size();

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("total_revenue", totalRevenue);
        dashboard.put("total_expenses", totalExpenses);
        dashboard.put("net_income", netIncome);
        dashboard.put("profit_margin", profitMargin.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("pending_tax_obligations", pendingTaxCount);
        return dashboard;
    }

    public List<Map<String, Object>> getMonthlyTrend(int months) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusMonths(months);

        List<Object[]> revenueRows = receiptVoucherRepository.sumByMonth(from, to);
        List<Object[]> expenseRows = expenseRepository.sumByMonth(from, to);

        Map<String, BigDecimal> revenueMap = new LinkedHashMap<>();
        for (Object[] row : revenueRows) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            String key = year + "-" + String.format("%02d", month);
            revenueMap.put(key, row[2] instanceof BigDecimal ? (BigDecimal) row[2] : new BigDecimal(row[2].toString()));
        }

        Map<String, BigDecimal> expenseMap = new LinkedHashMap<>();
        for (Object[] row : expenseRows) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            String key = year + "-" + String.format("%02d", month);
            expenseMap.put(key, row[2] instanceof BigDecimal ? (BigDecimal) row[2] : new BigDecimal(row[2].toString()));
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        LocalDate cursor = from.withDayOfMonth(1);
        while (!cursor.isAfter(to.withDayOfMonth(1))) {
            String key = cursor.getYear() + "-" + String.format("%02d", cursor.getMonthValue());
            String label = cursor.getMonth().name().substring(0, 3) + " " + cursor.getYear();
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("month", label);
            point.put("period", key);
            point.put("revenue", revenueMap.getOrDefault(key, BigDecimal.ZERO));
            point.put("expenses", expenseMap.getOrDefault(key, BigDecimal.ZERO));
            BigDecimal rev = revenueMap.getOrDefault(key, BigDecimal.ZERO);
            BigDecimal exp = expenseMap.getOrDefault(key, BigDecimal.ZERO);
            point.put("profit", rev.subtract(exp));
            trend.add(point);
            cursor = cursor.plusMonths(1);
        }
        return trend;
    }

    public List<Map<String, Object>> getRevenueBySource() {
        List<Object[]> rows = receiptVoucherRepository.sumBySourceCategory();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("source", row[0] != null ? row[0] : "Unknown");
            item.put("amount", row[1] instanceof BigDecimal ? (BigDecimal) row[1] : new BigDecimal(row[1].toString()));
            result.add(item);
        }
        return result;
    }

    public List<Map<String, Object>> getExpenseByCategory() {
        List<Object[]> rows = expenseRepository.sumByCategory();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("category", row[0] != null ? row[0] : "Unknown");
            item.put("amount", row[1] instanceof BigDecimal ? (BigDecimal) row[1] : new BigDecimal(row[1].toString()));
            result.add(item);
        }
        return result;
    }
}
