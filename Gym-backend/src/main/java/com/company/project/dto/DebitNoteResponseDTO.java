package com.company.project.dto;

import com.company.project.entities.DebitNote;
import java.math.BigDecimal;
import java.time.LocalDate;

public class DebitNoteResponseDTO {

    private Long id;
    private String voucherNo;
    private LocalDate date;
    private Long supplierId;
    private String supplierName;
    private Long linkedBillId;
    private String reason;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String status;
    private Long journalVoucherId;

    public DebitNoteResponseDTO() {}

    public static DebitNoteResponseDTO fromEntity(DebitNote n, Long journalVoucherId) {
        DebitNoteResponseDTO dto = new DebitNoteResponseDTO();
        dto.setId(n.getId());
        dto.setVoucherNo(n.getVoucherNo());
        dto.setDate(n.getDate());
        dto.setSupplierId(n.getSupplierId());
        dto.setSupplierName(n.getSupplierName());
        dto.setLinkedBillId(n.getLinkedBillId());
        dto.setReason(n.getReason());
        dto.setSubtotal(n.getSubtotal());
        dto.setTaxAmount(n.getTaxAmount());
        dto.setTotalAmount(n.getTotalAmount());
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

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }
}
