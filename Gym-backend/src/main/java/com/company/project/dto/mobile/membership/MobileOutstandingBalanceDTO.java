package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Server-authoritative outstanding-balance state for the authenticated member's
 * membership (a Member row), built from Member.outstandingBalance and the
 * member's unpaid bills (Receipt rows). Raw values only — the client formats.
 */
public class MobileOutstandingBalanceDTO {

    /** Why canPay is false. Null when canPay is true. */
    public enum PayBlockedReason {
        NO_MEMBERSHIP,
        NO_BALANCE,
        APPROVAL_PENDING,
        NO_PAYABLE_BILLS
    }

    /** "PAID" | "PARTIALLY_PAID" | "UNPAID" — derived from the open bills. */
    public enum BalancePaymentStatus {
        PAID,
        PARTIALLY_PAID,
        UNPAID
    }

    private Long membershipId;
    private String planName;
    // Totals across the member's open bills.
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    // Member.outstandingBalance — the same figure the Web billing screens show.
    private BigDecimal outstandingAmount;
    // What a self-service settlement will pay right now: the outstanding balance,
    // capped at what the open bills can absorb. Normally equal to outstandingAmount.
    private BigDecimal payableAmount;
    private String currency;
    private String currencySymbol;
    private BalancePaymentStatus paymentStatus;
    private boolean canPay;
    private PayBlockedReason payBlockedReason;
    private LocalDateTime dueDate;
    // Payment methods a member may settle with from Mobile (PaymentSplitDTO method titles).
    private List<String> allowedPaymentMethods;
    private List<Bill> bills;

    public static class Bill {
        private Long receiptId;
        private String invoiceNo;
        private String transactionType;
        private String planName;
        private LocalDateTime transactionDate;
        private LocalDateTime dueDate;
        private BigDecimal amount;
        private BigDecimal paidToDate;
        private BigDecimal outstandingAmount;

        public Long getReceiptId() { return receiptId; }
        public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

        public String getInvoiceNo() { return invoiceNo; }
        public void setInvoiceNo(String invoiceNo) { this.invoiceNo = invoiceNo; }

        public String getTransactionType() { return transactionType; }
        public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

        public String getPlanName() { return planName; }
        public void setPlanName(String planName) { this.planName = planName; }

        public LocalDateTime getTransactionDate() { return transactionDate; }
        public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

        public LocalDateTime getDueDate() { return dueDate; }
        public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public BigDecimal getPaidToDate() { return paidToDate; }
        public void setPaidToDate(BigDecimal paidToDate) { this.paidToDate = paidToDate; }

        public BigDecimal getOutstandingAmount() { return outstandingAmount; }
        public void setOutstandingAmount(BigDecimal outstandingAmount) { this.outstandingAmount = outstandingAmount; }
    }

    public Long getMembershipId() { return membershipId; }
    public void setMembershipId(Long membershipId) { this.membershipId = membershipId; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getOutstandingAmount() { return outstandingAmount; }
    public void setOutstandingAmount(BigDecimal outstandingAmount) { this.outstandingAmount = outstandingAmount; }

    public BigDecimal getPayableAmount() { return payableAmount; }
    public void setPayableAmount(BigDecimal payableAmount) { this.payableAmount = payableAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getCurrencySymbol() { return currencySymbol; }
    public void setCurrencySymbol(String currencySymbol) { this.currencySymbol = currencySymbol; }

    public BalancePaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(BalancePaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public boolean isCanPay() { return canPay; }
    public void setCanPay(boolean canPay) { this.canPay = canPay; }

    public PayBlockedReason getPayBlockedReason() { return payBlockedReason; }
    public void setPayBlockedReason(PayBlockedReason payBlockedReason) { this.payBlockedReason = payBlockedReason; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public List<String> getAllowedPaymentMethods() { return allowedPaymentMethods; }
    public void setAllowedPaymentMethods(List<String> allowedPaymentMethods) { this.allowedPaymentMethods = allowedPaymentMethods; }

    public List<Bill> getBills() { return bills; }
    public void setBills(List<Bill> bills) { this.bills = bills; }
}
