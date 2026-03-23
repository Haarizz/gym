package com.company.project.dto;

import java.math.BigDecimal;
import java.util.Map;

public class ExpenseStatsDTO {

    private BigDecimal totalAmount;
    private BigDecimal totalTax;
    private long totalCount;
    private long pendingCount;
    private long approvedCount;
    private Map<String, BigDecimal> byCategory;

    public ExpenseStatsDTO() {}

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getTotalTax() { return totalTax; }
    public void setTotalTax(BigDecimal totalTax) { this.totalTax = totalTax; }

    public long getTotalCount() { return totalCount; }
    public void setTotalCount(long totalCount) { this.totalCount = totalCount; }

    public long getPendingCount() { return pendingCount; }
    public void setPendingCount(long pendingCount) { this.pendingCount = pendingCount; }

    public long getApprovedCount() { return approvedCount; }
    public void setApprovedCount(long approvedCount) { this.approvedCount = approvedCount; }

    public Map<String, BigDecimal> getByCategory() { return byCategory; }
    public void setByCategory(Map<String, BigDecimal> byCategory) { this.byCategory = byCategory; }
}
