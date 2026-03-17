package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class PurchaseOrderRequestDTO {

    private Long supplierId;
    private String orderDate;
    private String expectedDeliveryDate;
    private String priority;
    private String paymentTerms;
    private String deliveryAddress;
    private String notes;
    private String createdBy;
    private BigDecimal shippingCost;
    private List<POItemRequest> items;

    public PurchaseOrderRequestDTO() {}

    public static class POItemRequest {
        private Long productId;
        private String productName;
        private String productSku;
        private String unitOfMeasure;
        private Integer quantityOrdered;
        private BigDecimal unitPrice;
        private BigDecimal discountPercent;
        private BigDecimal taxPercent;
        private String notes;

        public POItemRequest() {}

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

        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

        public BigDecimal getDiscountPercent() { return discountPercent; }
        public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }

        public BigDecimal getTaxPercent() { return taxPercent; }
        public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getOrderDate() { return orderDate; }
    public void setOrderDate(String orderDate) { this.orderDate = orderDate; }

    public String getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(String expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public BigDecimal getShippingCost() { return shippingCost; }
    public void setShippingCost(BigDecimal shippingCost) { this.shippingCost = shippingCost; }

    public List<POItemRequest> getItems() { return items; }
    public void setItems(List<POItemRequest> items) { this.items = items; }
}
