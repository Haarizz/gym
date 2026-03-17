package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class WastageReturnStatsDTO {

    private int totalVouchers;
    private int pendingApproval;
    private BigDecimal totalWastageValue;
    private BigDecimal totalReturnValue;
    private BigDecimal monthlyWastage;
    private BigDecimal monthlyReturns;
    private List<Map<String, Object>> topWastedProducts;
    private List<Map<String, Object>> topReturnReasons;

    public WastageReturnStatsDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public int getTotalVouchers() { return totalVouchers; }
    public void setTotalVouchers(int totalVouchers) { this.totalVouchers = totalVouchers; }

    public int getPendingApproval() { return pendingApproval; }
    public void setPendingApproval(int pendingApproval) { this.pendingApproval = pendingApproval; }

    public BigDecimal getTotalWastageValue() { return totalWastageValue; }
    public void setTotalWastageValue(BigDecimal totalWastageValue) { this.totalWastageValue = totalWastageValue; }

    public BigDecimal getTotalReturnValue() { return totalReturnValue; }
    public void setTotalReturnValue(BigDecimal totalReturnValue) { this.totalReturnValue = totalReturnValue; }

    public BigDecimal getMonthlyWastage() { return monthlyWastage; }
    public void setMonthlyWastage(BigDecimal monthlyWastage) { this.monthlyWastage = monthlyWastage; }

    public BigDecimal getMonthlyReturns() { return monthlyReturns; }
    public void setMonthlyReturns(BigDecimal monthlyReturns) { this.monthlyReturns = monthlyReturns; }

    public List<Map<String, Object>> getTopWastedProducts() { return topWastedProducts; }
    public void setTopWastedProducts(List<Map<String, Object>> topWastedProducts) { this.topWastedProducts = topWastedProducts; }

    public List<Map<String, Object>> getTopReturnReasons() { return topReturnReasons; }
    public void setTopReturnReasons(List<Map<String, Object>> topReturnReasons) { this.topReturnReasons = topReturnReasons; }
}
