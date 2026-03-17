package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class SessionReportDTO {

    private PosSessionResponseDTO session;
    private BigDecimal totalSales;
    private BigDecimal totalReturns;
    private BigDecimal netSales;
    private int transactionCount;
    private int returnCount;
    private List<PaymentBreakdownItem> paymentBreakdown;
    private List<CategoryBreakdownItem> categoryBreakdown;
    private List<CashMovementDTO> cashMovements;
    private BigDecimal totalCashDrops;
    private BigDecimal totalCashOuts;
    private BigDecimal cashSales;
    private BigDecimal expectedCash;

    public SessionReportDTO() {}

    public SessionReportDTO(PosSessionResponseDTO session,
                            BigDecimal totalSales,
                            BigDecimal totalReturns,
                            BigDecimal netSales,
                            int transactionCount,
                            int returnCount,
                            List<PaymentBreakdownItem> paymentBreakdown,
                            List<CategoryBreakdownItem> categoryBreakdown,
                            List<CashMovementDTO> cashMovements,
                            BigDecimal totalCashDrops,
                            BigDecimal totalCashOuts,
                            BigDecimal cashSales,
                            BigDecimal expectedCash) {
        this.session = session;
        this.totalSales = totalSales;
        this.totalReturns = totalReturns;
        this.netSales = netSales;
        this.transactionCount = transactionCount;
        this.returnCount = returnCount;
        this.paymentBreakdown = paymentBreakdown;
        this.categoryBreakdown = categoryBreakdown;
        this.cashMovements = cashMovements;
        this.totalCashDrops = totalCashDrops;
        this.totalCashOuts = totalCashOuts;
        this.cashSales = cashSales;
        this.expectedCash = expectedCash;
    }

    // ── Inner static classes ──────────────────────────────────────────────

    public static class PaymentBreakdownItem {
        private String paymentMethod;
        private int transactionCount;
        private BigDecimal totalAmount;

        public PaymentBreakdownItem() {}

        public PaymentBreakdownItem(String paymentMethod, int transactionCount, BigDecimal totalAmount) {
            this.paymentMethod = paymentMethod;
            this.transactionCount = transactionCount;
            this.totalAmount = totalAmount;
        }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public int getTransactionCount() { return transactionCount; }
        public void setTransactionCount(int transactionCount) { this.transactionCount = transactionCount; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    public static class CategoryBreakdownItem {
        private String categoryName;
        private int unitsSold;
        private BigDecimal totalAmount;

        public CategoryBreakdownItem() {}

        public CategoryBreakdownItem(String categoryName, int unitsSold, BigDecimal totalAmount) {
            this.categoryName = categoryName;
            this.unitsSold = unitsSold;
            this.totalAmount = totalAmount;
        }

        public String getCategoryName() { return categoryName; }
        public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

        public int getUnitsSold() { return unitsSold; }
        public void setUnitsSold(int unitsSold) { this.unitsSold = unitsSold; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public PosSessionResponseDTO getSession() { return session; }
    public void setSession(PosSessionResponseDTO session) { this.session = session; }

    public BigDecimal getTotalSales() { return totalSales; }
    public void setTotalSales(BigDecimal totalSales) { this.totalSales = totalSales; }

    public BigDecimal getTotalReturns() { return totalReturns; }
    public void setTotalReturns(BigDecimal totalReturns) { this.totalReturns = totalReturns; }

    public BigDecimal getNetSales() { return netSales; }
    public void setNetSales(BigDecimal netSales) { this.netSales = netSales; }

    public int getTransactionCount() { return transactionCount; }
    public void setTransactionCount(int transactionCount) { this.transactionCount = transactionCount; }

    public int getReturnCount() { return returnCount; }
    public void setReturnCount(int returnCount) { this.returnCount = returnCount; }

    public List<PaymentBreakdownItem> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentBreakdownItem> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public List<CategoryBreakdownItem> getCategoryBreakdown() { return categoryBreakdown; }
    public void setCategoryBreakdown(List<CategoryBreakdownItem> categoryBreakdown) { this.categoryBreakdown = categoryBreakdown; }

    public List<CashMovementDTO> getCashMovements() { return cashMovements; }
    public void setCashMovements(List<CashMovementDTO> cashMovements) { this.cashMovements = cashMovements; }

    public BigDecimal getTotalCashDrops() { return totalCashDrops; }
    public void setTotalCashDrops(BigDecimal totalCashDrops) { this.totalCashDrops = totalCashDrops; }

    public BigDecimal getTotalCashOuts() { return totalCashOuts; }
    public void setTotalCashOuts(BigDecimal totalCashOuts) { this.totalCashOuts = totalCashOuts; }

    public BigDecimal getCashSales() { return cashSales; }
    public void setCashSales(BigDecimal cashSales) { this.cashSales = cashSales; }

    public BigDecimal getExpectedCash() { return expectedCash; }
    public void setExpectedCash(BigDecimal expectedCash) { this.expectedCash = expectedCash; }
}
