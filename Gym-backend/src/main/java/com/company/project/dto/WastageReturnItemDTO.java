package com.company.project.dto;

import com.company.project.entities.WastageReturnItem;
import java.math.BigDecimal;

public class WastageReturnItemDTO {

    private Long id;
    private Long voucherId;
    private Long productId;
    private String productName;
    private String sku;
    private String batchNo;
    private Integer quantity;
    private BigDecimal unitCost;
    private BigDecimal totalCost;
    private String unit;
    private String reasonSpecific;

    public WastageReturnItemDTO() {}

    public static WastageReturnItemDTO fromEntity(WastageReturnItem e) {
        WastageReturnItemDTO dto = new WastageReturnItemDTO();
        dto.setId(e.getId());
        dto.setVoucherId(e.getVoucherId());
        dto.setProductId(e.getProductId());
        dto.setProductName(e.getProductName());
        dto.setSku(e.getSku());
        dto.setBatchNo(e.getBatchNo());
        dto.setQuantity(e.getQuantity());
        dto.setUnitCost(e.getUnitCost());
        dto.setTotalCost(e.getTotalCost());
        dto.setUnit(e.getUnit());
        dto.setReasonSpecific(e.getReasonSpecific());
        return dto;
    }

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
