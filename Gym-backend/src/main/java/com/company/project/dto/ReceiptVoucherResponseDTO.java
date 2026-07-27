package com.company.project.dto;

import com.company.project.entities.ReceiptVoucher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ReceiptVoucherResponseDTO {

    private Long id;
    private String voucherNo;
    private LocalDate date;
    private String source;
    private String sourceCategory;
    private Long memberId;
    private String memberName;
    private BigDecimal amount;
    private String paymentMode;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String status;
    private String branch;
    private String reference;
    private String notes;
    private String transactionId;
    private String approvedBy;
    private String voucherType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long journalVoucherId;

    public ReceiptVoucherResponseDTO() {}

    public static ReceiptVoucherResponseDTO fromEntity(ReceiptVoucher rv) {
        return fromEntity(rv, null);
    }

    /**
     * @param journalVoucherId the posted ledger entry this voucher generated, or
     *                         null if it has not (yet) been posted — see
     *                         ReceiptVoucherService.postToLedgerIfNeeded().
     */
    public static ReceiptVoucherResponseDTO fromEntity(ReceiptVoucher rv, Long journalVoucherId) {
        ReceiptVoucherResponseDTO dto = new ReceiptVoucherResponseDTO();
        dto.setJournalVoucherId(journalVoucherId);
        dto.setId(rv.getId());
        dto.setVoucherNo(rv.getVoucherNo());
        dto.setDate(rv.getDate());
        dto.setSource(rv.getSource());
        dto.setSourceCategory(rv.getSourceCategory());
        dto.setMemberId(rv.getMemberId());
        dto.setMemberName(rv.getMemberName());
        dto.setAmount(rv.getAmount());
        dto.setPaymentMode(rv.getPaymentMode());
        dto.setPaymentBreakdown(rv.getPaymentBreakdown());
        dto.setStatus(rv.getStatus());
        dto.setBranch(rv.getBranch());
        dto.setReference(rv.getReference());
        dto.setNotes(rv.getNotes());
        dto.setTransactionId(rv.getTransactionId());
        dto.setApprovedBy(rv.getApprovedBy());
        dto.setVoucherType(rv.getVoucherType());
        dto.setCreatedAt(rv.getCreatedAt());
        dto.setUpdatedAt(rv.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }
}
