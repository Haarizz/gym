package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Dashboard stats returned by GET /api/billing/stats
 * Jackson serializes camelCase → snake_case via global SNAKE_CASE strategy.
 */
public class BillingStatsDTO {

    private BigDecimal monthlyCollection;
    private BigDecimal monthlyTarget;
    private long overdueCount;
    private BigDecimal overdueAmount;
    private long dueSoonCount;
    private double collectionRate;
    private List<MonthlyData> monthlyData;
    private Map<String, BigDecimal> paymentMethodBreakdown;

    public static class MonthlyData {
        private String month;   // e.g. "Jan 2026"
        private BigDecimal collected;
        private BigDecimal target;

        public MonthlyData(String month, BigDecimal collected, BigDecimal target) {
            this.month = month;
            this.collected = collected;
            this.target = target;
        }

        public String getMonth()          { return month; }
        public BigDecimal getCollected()  { return collected; }
        public BigDecimal getTarget()     { return target; }
    }

    // Getters & Setters
    public BigDecimal getMonthlyCollection()                          { return monthlyCollection; }
    public void setMonthlyCollection(BigDecimal monthlyCollection)    { this.monthlyCollection = monthlyCollection; }

    public BigDecimal getMonthlyTarget()                              { return monthlyTarget; }
    public void setMonthlyTarget(BigDecimal monthlyTarget)            { this.monthlyTarget = monthlyTarget; }

    public long getOverdueCount()                                     { return overdueCount; }
    public void setOverdueCount(long overdueCount)                    { this.overdueCount = overdueCount; }

    public BigDecimal getOverdueAmount()                              { return overdueAmount; }
    public void setOverdueAmount(BigDecimal overdueAmount)            { this.overdueAmount = overdueAmount; }

    public long getDueSoonCount()                                     { return dueSoonCount; }
    public void setDueSoonCount(long dueSoonCount)                    { this.dueSoonCount = dueSoonCount; }

    public double getCollectionRate()                                 { return collectionRate; }
    public void setCollectionRate(double collectionRate)              { this.collectionRate = collectionRate; }

    public List<MonthlyData> getMonthlyData()                        { return monthlyData; }
    public void setMonthlyData(List<MonthlyData> monthlyData)        { this.monthlyData = monthlyData; }

    public Map<String, BigDecimal> getPaymentMethodBreakdown()                         { return paymentMethodBreakdown; }
    public void setPaymentMethodBreakdown(Map<String, BigDecimal> paymentMethodBreakdown) { this.paymentMethodBreakdown = paymentMethodBreakdown; }

    // Today's collection (Billing's "Today's Collection" card), and what this month's and
    // today's bills left unpaid — the "on credit" line under each collection card.
    private BigDecimal todayCollection = BigDecimal.ZERO;
    private Map<String, BigDecimal> todayPaymentMethodBreakdown;
    private BigDecimal todayOnCredit = BigDecimal.ZERO;
    private BigDecimal monthlyOnCredit = BigDecimal.ZERO;

    public BigDecimal getTodayCollection() { return todayCollection; }
    public void setTodayCollection(BigDecimal todayCollection) { this.todayCollection = todayCollection; }
    public Map<String, BigDecimal> getTodayPaymentMethodBreakdown() { return todayPaymentMethodBreakdown; }
    public void setTodayPaymentMethodBreakdown(Map<String, BigDecimal> m) { this.todayPaymentMethodBreakdown = m; }
    public BigDecimal getTodayOnCredit() { return todayOnCredit; }
    public void setTodayOnCredit(BigDecimal todayOnCredit) { this.todayOnCredit = todayOnCredit; }
    public BigDecimal getMonthlyOnCredit() { return monthlyOnCredit; }
    public void setMonthlyOnCredit(BigDecimal monthlyOnCredit) { this.monthlyOnCredit = monthlyOnCredit; }
}
