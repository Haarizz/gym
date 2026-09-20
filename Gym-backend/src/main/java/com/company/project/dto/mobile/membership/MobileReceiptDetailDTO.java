package com.company.project.dto.mobile.membership;

import com.company.project.entities.Receipt;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * Read-only receipt detail for the member mobile app.
 * Exposes the fields a member needs to view their own receipt —
 * intentionally omits internal fields (memberDbId, bankAccountCode,
 * approvalStatus, linkedBillId, etc.) that are admin-only concerns.
 *
 * Jackson serializes camelCase fields to snake_case via the global
 * SNAKE_CASE property naming strategy.
 */
public class MobileReceiptDetailDTO {

    private Long id;
    private String receiptNo;
    private String transactionDate;
    private String transactionType;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal dueAmount;
    private String paymentMethod;
    private String status;
    private String planName;
    private String validFrom;
    private String validTill;
    private String processedBy;
    private String memberName;
    private String memberId;
    private String memberPhone;
    private String membershipType;
    private String remarks;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * Maps a Receipt entity to a mobile-appropriate DTO.
     * Ownership must be checked by the caller BEFORE calling this.
     */
    public static MobileReceiptDetailDTO fromEntity(Receipt r) {
        MobileReceiptDetailDTO dto = new MobileReceiptDetailDTO();
        dto.id              = r.getId();
        dto.receiptNo       = r.getReceiptNo();
        dto.transactionDate = r.getTransactionDate() != null ? r.getTransactionDate().format(ISO) + "Z" : null;
        dto.transactionType = r.getTransactionType();
        dto.amount          = r.getAmount();
        dto.paidAmount      = r.getPaidAmount() != null ? r.getPaidAmount() : BigDecimal.ZERO;
        // Compute due: totalAmount - cumulativePaid (fallback to paidAmount for legacy rows)
        BigDecimal totalAmt      = r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO;
        BigDecimal cumulativePaid = r.getTotalPaidToDate() != null ? r.getTotalPaidToDate() : dto.paidAmount;
        dto.dueAmount       = totalAmt.subtract(cumulativePaid).max(BigDecimal.ZERO);
        dto.paymentMethod   = r.getPaymentMethod();
        dto.status          = r.getStatus();
        dto.planName        = r.getPlanName();
        dto.validFrom       = r.getValidFrom() != null ? r.getValidFrom().format(ISO) + "Z" : null;
        dto.validTill       = r.getValidTill() != null ? r.getValidTill().format(ISO) + "Z" : null;
        dto.processedBy     = r.getProcessedBy();
        dto.memberName      = r.getMemberName();
        dto.memberId        = r.getMemberId();
        dto.memberPhone     = r.getMemberPhone();
        dto.membershipType  = r.getMembershipType();
        dto.remarks         = r.getRemarks();
        return dto;
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getReceiptNo() { return receiptNo; }
    public String getTransactionDate() { return transactionDate; }
    public String getTransactionType() { return transactionType; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public BigDecimal getDueAmount() { return dueAmount; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getStatus() { return status; }
    public String getPlanName() { return planName; }
    public String getValidFrom() { return validFrom; }
    public String getValidTill() { return validTill; }
    public String getProcessedBy() { return processedBy; }
    public String getMemberName() { return memberName; }
    public String getMemberId() { return memberId; }
    public String getMemberPhone() { return memberPhone; }
    public String getMembershipType() { return membershipType; }
    public String getRemarks() { return remarks; }
}
