package com.company.project.dto;

import com.company.project.entities.SalesInvoiceItem;

import java.math.BigDecimal;

/** One sales invoice line — request body and response. Amount fields are server-computed. */
public class SalesInvoiceItemDTO {

    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String unitOfMeasure;
    private Long warehouseId;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private String notes;

    // Response only
    private BigDecimal discountAmount;
    private BigDecimal footerDiscountShare;
    private BigDecimal taxPercent;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;

    public SalesInvoiceItemDTO() {}

    public static SalesInvoiceItemDTO fromEntity(SalesInvoiceItem i) {
        SalesInvoiceItemDTO dto = new SalesInvoiceItemDTO();
        dto.setId(i.getId());
        dto.setProductId(i.getProductId());
        dto.setProductName(i.getProductName());
        dto.setProductSku(i.getProductSku());
        dto.setUnitOfMeasure(i.getUnitOfMeasure());
        dto.setWarehouseId(i.getWarehouseId());
        dto.setQuantity(i.getQuantity());
        dto.setUnitPrice(i.getUnitPrice());
        dto.setDiscountPercent(i.getDiscountPercent());
        dto.setNotes(i.getNotes());
        dto.setDiscountAmount(i.getDiscountAmount());
        dto.setFooterDiscountShare(i.getFooterDiscountShare());
        dto.setTaxPercent(i.getTaxPercent());
        dto.setTaxableAmount(i.getTaxableAmount());
        dto.setTaxAmount(i.getTaxAmount());
        dto.setTotalAmount(i.getTotalAmount());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getUnitOfMeasure() { return unitOfMeasure; }
    public void setUnitOfMeasure(String unitOfMeasure) { this.unitOfMeasure = unitOfMeasure; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getFooterDiscountShare() { return footerDiscountShare; }
    public void setFooterDiscountShare(BigDecimal footerDiscountShare) { this.footerDiscountShare = footerDiscountShare; }

    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }

    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}
