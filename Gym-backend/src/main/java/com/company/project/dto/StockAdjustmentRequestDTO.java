package com.company.project.dto;

public class StockAdjustmentRequestDTO {

    private Long warehouseId;
    // ADD / SUBTRACT / SET
    private String adjustmentType;
    private Integer quantity;
    private String reason;

    public StockAdjustmentRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public String getAdjustmentType() { return adjustmentType; }
    public void setAdjustmentType(String adjustmentType) { this.adjustmentType = adjustmentType; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
