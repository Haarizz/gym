package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DebitNoteRequestDTO {

    private LocalDate date;
    private Long supplierId;
    private String supplierName;
    private Long linkedBillId;
    private String reason;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;

    public DebitNoteRequestDTO() {}

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public Long getLinkedBillId() { return linkedBillId; }
    public void setLinkedBillId(Long linkedBillId) { this.linkedBillId = linkedBillId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
}
