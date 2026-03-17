package com.company.project.dto;

import com.company.project.entities.SaleTransactionItem;

import java.math.BigDecimal;

public class SaleTransactionItemDTO {

    private Long id;
    private Long transactionId;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;

    public SaleTransactionItemDTO() {}

    public static SaleTransactionItemDTO fromEntity(SaleTransactionItem i) {
        SaleTransactionItemDTO dto = new SaleTransactionItemDTO();
        dto.setId(i.getId());
        dto.setTransactionId(i.getTransactionId());
        dto.setProductId(i.getProductId());
        dto.setProductName(i.getProductName());
        dto.setProductSku(i.getProductSku());
        dto.setQuantity(i.getQuantity());
        dto.setUnitPrice(i.getUnitPrice());
        dto.setDiscountPercent(i.getDiscountPercent());
        dto.setDiscountAmount(i.getDiscountAmount());
        dto.setTaxAmount(i.getTaxAmount());
        dto.setTotalAmount(i.getTotalAmount());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}
