package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class MobilePaymentHistoryDTO {
    
    private Long id;
    private String receiptNo;
    private LocalDateTime transactionDate;
    private String transactionType; // "New", "Renewal", "Payment", etc.
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private String paymentMethod;
    private String status; // "Paid", "Pending", "Partial"

    public MobilePaymentHistoryDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReceiptNo() { return receiptNo; }
    public void setReceiptNo(String receiptNo) { this.receiptNo = receiptNo; }

    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
