package com.company.project.dto;

import com.company.project.entities.SupplierBill;
import com.company.project.entities.SupplierBillItem;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class SupplierBillResponseDTO {

    private Long id;
    private String billNumber;
    private Long supplierId;
    private String supplierName;
    private Long purchaseOrderId;
    private String invoiceNumber;
    private LocalDate billDate;
    private LocalDate dueDate;
    private String status;
    private String paymentStatus;
    private BigDecimal amountPaid;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal shippingCost;
    private BigDecimal totalAmount;
    private Long warehouseId;
    private String priority;
    private String notes;
    private String receivedBy;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private List<SupplierBillItemDTO> items;

    public SupplierBillResponseDTO() {}

    public static SupplierBillResponseDTO fromEntity(SupplierBill bill, List<SupplierBillItem> items) {
        SupplierBillResponseDTO dto = new SupplierBillResponseDTO();
        dto.setId(bill.getId());
        dto.setBillNumber(bill.getBillNumber());
        dto.setSupplierId(bill.getSupplierId());
        dto.setSupplierName(bill.getSupplierName());
        dto.setPurchaseOrderId(bill.getPurchaseOrderId());
        dto.setInvoiceNumber(bill.getInvoiceNumber());
        dto.setBillDate(bill.getBillDate());
        dto.setDueDate(bill.getDueDate());
        dto.setStatus(bill.getStatus());
        dto.setPaymentStatus(bill.getPaymentStatus());
        dto.setAmountPaid(bill.getAmountPaid());
        dto.setSubtotal(bill.getSubtotal());
        dto.setDiscountAmount(bill.getDiscountAmount());
        dto.setTaxAmount(bill.getTaxAmount());
        dto.setShippingCost(bill.getShippingCost());
        dto.setTotalAmount(bill.getTotalAmount());
        dto.setWarehouseId(bill.getWarehouseId());
        dto.setPriority(bill.getPriority());
        dto.setNotes(bill.getNotes());
        dto.setReceivedBy(bill.getReceivedBy());
        dto.setPaymentMethod(bill.getPaymentMethod());
        dto.setPaymentBreakdown(bill.getPaymentBreakdown());
        dto.setCreatedAt(bill.getCreatedAt());
        dto.setUpdatedAt(bill.getUpdatedAt());
        dto.setItems(items.stream().map(SupplierBillItemDTO::fromEntity).collect(Collectors.toList()));
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public Long getPurchaseOrderId() { return purchaseOrderId; }
    public void setPurchaseOrderId(Long purchaseOrderId) { this.purchaseOrderId = purchaseOrderId; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getBillDate() { return billDate; }
    public void setBillDate(LocalDate billDate) { this.billDate = billDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getShippingCost() { return shippingCost; }
    public void setShippingCost(BigDecimal shippingCost) { this.shippingCost = shippingCost; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<SupplierBillItemDTO> getItems() { return items; }
    public void setItems(List<SupplierBillItemDTO> items) { this.items = items; }
}
