package com.company.project.dto;

import java.math.BigDecimal;

public class PaymentVoucherStatsDTO {

    private BigDecimal totalPaidThisMonth;
    private BigDecimal totalPending;
    private long overdueCount;
    private long upcomingPayments;

    public BigDecimal getTotalPaidThisMonth() { return totalPaidThisMonth; }
    public void setTotalPaidThisMonth(BigDecimal totalPaidThisMonth) { this.totalPaidThisMonth = totalPaidThisMonth; }

    public BigDecimal getTotalPending() { return totalPending; }
    public void setTotalPending(BigDecimal totalPending) { this.totalPending = totalPending; }

    public long getOverdueCount() { return overdueCount; }
    public void setOverdueCount(long overdueCount) { this.overdueCount = overdueCount; }

    public long getUpcomingPayments() { return upcomingPayments; }
    public void setUpcomingPayments(long upcomingPayments) { this.upcomingPayments = upcomingPayments; }
}
