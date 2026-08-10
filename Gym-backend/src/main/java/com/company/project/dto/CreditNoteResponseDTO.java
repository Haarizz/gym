package com.company.project.dto;

import com.company.project.entities.CreditNote;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreditNoteResponseDTO {

    private Long id;
    private String voucherNo;
    private LocalDate date;
    private Long memberDbId;
    private String memberName;
    private Long linkedReceiptId;
    private String reason;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String refundMethod;
    private String status;
    private Long journalVoucherId;

    public CreditNoteResponseDTO() {}

    public static CreditNoteResponseDTO fromEntity(CreditNote n, Long journalVoucherId) {
        CreditNoteResponseDTO dto = new CreditNoteResponseDTO();
        dto.setId(n.getId());
        dto.setVoucherNo(n.getVoucherNo());
        dto.setDate(n.getDate());
        dto.setMemberDbId(n.getMemberDbId());
        dto.setMemberName(n.getMemberName());
        dto.setLinkedReceiptId(n.getLinkedReceiptId());
        dto.setReason(n.getReason());
        dto.setSubtotal(n.getSubtotal());
        dto.setTaxAmount(n.getTaxAmount());
        dto.setTotalAmount(n.getTotalAmount());
        dto.setRefundMethod(n.getRefundMethod());
        dto.setStatus(n.getStatus());
        dto.setJournalVoucherId(journalVoucherId);
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public Long getLinkedReceiptId() { return linkedReceiptId; }
    public void setLinkedReceiptId(Long linkedReceiptId) { this.linkedReceiptId = linkedReceiptId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }
}
