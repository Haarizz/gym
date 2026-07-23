package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "wastage_return_items")
public class WastageReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "sku")
    private String sku;

    @Column(name = "batch_no")
    private String batchNo;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "total_cost", precision = 12, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(name = "unit")
    private String unit;

    @Column(name = "reason_specific")
    private String reasonSpecific;

    public WastageReturnItem() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getVoucherId() { return voucherId; }
    public void setVoucherId(Long voucherId) { this.voucherId = voucherId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getBatchNo() { return batchNo; }
    public void setBatchNo(String batchNo) { this.batchNo = batchNo; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }

    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReasonSpecific() { return reasonSpecific; }
    public void setReasonSpecific(String reasonSpecific) { this.reasonSpecific = reasonSpecific; }
}
