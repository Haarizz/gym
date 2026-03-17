package com.company.project.dto;

import com.company.project.entities.PurchaseOrderItem;

import java.math.BigDecimal;

public class PurchaseOrderItemDTO {

    private Long id;
    private Long purchaseOrderId;
    private Long productId;
    private String productName;
    private String productSku;
    private String unitOfMeasure;
    private Integer quantityOrdered;
    private Integer quantityReceived;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private BigDecimal taxPercent;
    private BigDecimal totalAmount;
    private String notes;

    public PurchaseOrderItemDTO() {}

    public static PurchaseOrderItemDTO fromEntity(PurchaseOrderItem i) {
        PurchaseOrderItemDTO dto = new PurchaseOrderItemDTO();
        dto.setId(i.getId());
        dto.setPurchaseOrderId(i.getPurchaseOrderId());
        dto.setProductId(i.getProductId());
        dto.setProductName(i.getProductName());
        dto.setProductSku(i.getProductSku());
        dto.setUnitOfMeasure(i.getUnitOfMeasure());
        dto.setQuantityOrdered(i.getQuantityOrdered());
        dto.setQuantityReceived(i.getQuantityReceived());
        dto.setUnitPrice(i.getUnitPrice());
        dto.setDiscountPercent(i.getDiscountPercent());
        dto.setTaxPercent(i.getTaxPercent());
        dto.setTotalAmount(i.getTotalAmount());
        dto.setNotes(i.getNotes());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPurchaseOrderId() { return purchaseOrderId; }
    public void setPurchaseOrderId(Long purchaseOrderId) { this.purchaseOrderId = purchaseOrderId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getUnitOfMeasure() { return unitOfMeasure; }
    public void setUnitOfMeasure(String unitOfMeasure) { this.unitOfMeasure = unitOfMeasure; }

    public Integer getQuantityOrdered() { return quantityOrdered; }
    public void setQuantityOrdered(Integer quantityOrdered) { this.quantityOrdered = quantityOrdered; }

    public Integer getQuantityReceived() { return quantityReceived; }
    public void setQuantityReceived(Integer quantityReceived) { this.quantityReceived = quantityReceived; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
