package com.company.project.dto;

import com.company.project.entities.PurchaseOrder;
import com.company.project.entities.PurchaseOrderItem;
import com.company.project.entities.Supplier;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class PurchaseOrderResponseDTO {

    private Long id;
    private String poNumber;
    private Long supplierId;
    private String supplierName;
    private LocalDateTime orderDate;
    private LocalDateTime expectedDeliveryDate;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime actualDeliveryDate;
    private String status;
    private String priority;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal shippingCost;
    private BigDecimal totalAmount;
    private String paymentTerms;
    private String deliveryAddress;
    private String notes;
    private String createdBy;
    private String approvedBy;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private List<PurchaseOrderItemDTO> items;

    public PurchaseOrderResponseDTO() {}

    public static PurchaseOrderResponseDTO fromEntity(PurchaseOrder po, Supplier supplier, List<PurchaseOrderItem> items) {
        PurchaseOrderResponseDTO dto = new PurchaseOrderResponseDTO();
        dto.setId(po.getId());
        dto.setPoNumber(po.getPoNumber());
        dto.setSupplierId(po.getSupplierId());
        dto.setSupplierName(supplier != null ? supplier.getName() : po.getSupplierName());
        dto.setOrderDate(po.getOrderDate());
        dto.setExpectedDeliveryDate(po.getExpectedDeliveryDate());
        dto.setActualDeliveryDate(po.getActualDeliveryDate());
        dto.setStatus(po.getStatus());
        dto.setPriority(po.getPriority());
        dto.setSubtotal(po.getSubtotal());
        dto.setDiscountAmount(po.getDiscountAmount());
        dto.setTaxAmount(po.getTaxAmount());
        dto.setShippingCost(po.getShippingCost());
        dto.setTotalAmount(po.getTotalAmount());
        dto.setPaymentTerms(po.getPaymentTerms());
        dto.setDeliveryAddress(po.getDeliveryAddress());
        dto.setNotes(po.getNotes());
        dto.setCreatedBy(po.getCreatedBy());
        dto.setApprovedBy(po.getApprovedBy());
        dto.setCreatedAt(po.getCreatedAt());
        dto.setUpdatedAt(po.getUpdatedAt());
        dto.setItems(items.stream().map(PurchaseOrderItemDTO::fromEntity).collect(Collectors.toList()));
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }

    public LocalDateTime getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(LocalDateTime expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

    public LocalDateTime getActualDeliveryDate() { return actualDeliveryDate; }
    public void setActualDeliveryDate(LocalDateTime actualDeliveryDate) { this.actualDeliveryDate = actualDeliveryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

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

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PurchaseOrderItemDTO> getItems() { return items; }
    public void setItems(List<PurchaseOrderItemDTO> items) { this.items = items; }
}
