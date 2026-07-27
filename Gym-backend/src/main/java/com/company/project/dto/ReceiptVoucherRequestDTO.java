package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ReceiptVoucherRequestDTO {

    private LocalDate date;
    private String source;
    private String sourceCategory;
    private Long memberId;
    private String memberName;
    private BigDecimal amount;
    private String paymentMode;
    private List<PaymentSplitDTO> paymentBreakdown; // legs when paymentMode == "Mixed"
    private String status;
    private String branch;
    private String reference;
    private String notes;
    private String transactionId;
    private String approvedBy;
    private String voucherType;

    public ReceiptVoucherRequestDTO() {}

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getSourceCategory() { return sourceCategory; }
    public void setSourceCategory(String sourceCategory) { this.sourceCategory = sourceCategory; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getVoucherType() { return voucherType; }
    public void setVoucherType(String voucherType) { this.voucherType = voucherType; }
}
