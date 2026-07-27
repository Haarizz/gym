package com.company.project.dto;

import com.company.project.entities.Receipt;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Response DTO for Receipt.
 * Jackson serializes camelCase fields to snake_case via the global SNAKE_CASE strategy.
 */
public class ReceiptResponseDTO {

    private String id;
    private String receiptNo;
    private String transactionDate;
    private String memberDbId;
    private String memberId;
    private String memberName;
    private String memberPhone;
    private String transactionType;
    private BigDecimal amount;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String status;
    private String planName;
    private String validFrom;
    private String validTill;
    private String processedBy;
    private String remarks;
    private String membershipType;
    private java.math.BigDecimal paidAmount;
    private java.math.BigDecimal dueAmount;
    private String dueDate;
    private String createdAt;
    private String updatedAt;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static ReceiptResponseDTO fromEntity(Receipt r) {
        ReceiptResponseDTO dto = new ReceiptResponseDTO();
        dto.id              = r.getId() != null ? String.valueOf(r.getId()) : null;
        dto.receiptNo       = r.getReceiptNo();
        dto.transactionDate = r.getTransactionDate() != null ? r.getTransactionDate().format(ISO) + "Z" : null;
        dto.memberDbId      = r.getMemberDbId() != null ? String.valueOf(r.getMemberDbId()) : null;
        dto.memberId        = r.getMemberId();
        dto.memberName      = r.getMemberName();
        dto.memberPhone     = r.getMemberPhone();
        dto.transactionType = r.getTransactionType();
        dto.amount          = r.getAmount();
        dto.paymentMethod   = r.getPaymentMethod();
        dto.paymentBreakdown = r.getPaymentBreakdown();
        dto.status          = r.getStatus();
        dto.planName        = r.getPlanName();
        dto.validFrom       = r.getValidFrom() != null ? r.getValidFrom().format(ISO) + "Z" : null;
        dto.validTill       = r.getValidTill() != null ? r.getValidTill().format(ISO) + "Z" : null;
        dto.processedBy     = r.getProcessedBy();
        dto.remarks         = r.getRemarks();
        dto.membershipType  = r.getMembershipType();
        java.math.BigDecimal totalAmt = r.getAmount() != null ? r.getAmount() : java.math.BigDecimal.ZERO;
        dto.paidAmount      = r.getPaidAmount() != null ? r.getPaidAmount() : java.math.BigDecimal.ZERO;
        dto.dueAmount       = totalAmt.subtract(dto.paidAmount).max(java.math.BigDecimal.ZERO);
        dto.dueDate         = r.getDueDate() != null ? r.getDueDate().format(ISO) + "Z" : null;
        dto.createdAt       = r.getCreatedAt() != null ? r.getCreatedAt().format(ISO) + "Z" : null;
        dto.updatedAt       = r.getUpdatedAt() != null ? r.getUpdatedAt().format(ISO) + "Z" : null;
        return dto;
    }

    // ── Getters (Jackson uses these for serialization) ──────────────────────

    public String getId() { return id; }
    public String getReceiptNo() { return receiptNo; }
    public String getTransactionDate() { return transactionDate; }
    public String getMemberDbId() { return memberDbId; }
    public String getMemberId() { return memberId; }
    public String getMemberName() { return memberName; }
    public String getMemberPhone() { return memberPhone; }
    public String getTransactionType() { return transactionType; }
    public BigDecimal getAmount() { return amount; }
    public String getPaymentMethod() { return paymentMethod; }
    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public String getStatus() { return status; }
    public String getPlanName() { return planName; }
    public String getValidFrom() { return validFrom; }
    public String getValidTill() { return validTill; }
    public String getProcessedBy() { return processedBy; }
    public String getRemarks() { return remarks; }
    public String getMembershipType() { return membershipType; }
    public java.math.BigDecimal getPaidAmount() { return paidAmount; }
    public java.math.BigDecimal getDueAmount() { return dueAmount; }
    public String getDueDate() { return dueDate; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
}
