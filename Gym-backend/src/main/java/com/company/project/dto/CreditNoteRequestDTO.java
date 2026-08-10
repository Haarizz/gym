package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreditNoteRequestDTO {

    private LocalDate date;
    private Long memberDbId;
    private String memberName;
    private Long linkedReceiptId;
    private String reason;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private String refundMethod;

    public CreditNoteRequestDTO() {}

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

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
}
