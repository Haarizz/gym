package com.company.project.dto;

import com.company.project.entities.SupplierBillItem;

import java.math.BigDecimal;

public class SupplierBillItemDTO {

    private Long id;
    private Long billId;
    private Long productId;
    private String productName;
    private String productSku;
    private String unitOfMeasure;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private BigDecimal taxPercent;
    private BigDecimal totalAmount;
    private String notes;

    public SupplierBillItemDTO() {}

    public static SupplierBillItemDTO fromEntity(SupplierBillItem i) {
        SupplierBillItemDTO dto = new SupplierBillItemDTO();
        dto.setId(i.getId());
        dto.setBillId(i.getBillId());
        dto.setProductId(i.getProductId());
        dto.setProductName(i.getProductName());
        dto.setProductSku(i.getProductSku());
        dto.setUnitOfMeasure(i.getUnitOfMeasure());
        dto.setQuantity(i.getQuantity());
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

    public Long getBillId() { return billId; }
    public void setBillId(Long billId) { this.billId = billId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getUnitOfMeasure() { return unitOfMeasure; }
    public void setUnitOfMeasure(String unitOfMeasure) { this.unitOfMeasure = unitOfMeasure; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

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
