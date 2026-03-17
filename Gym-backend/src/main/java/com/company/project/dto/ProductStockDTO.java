package com.company.project.dto;

public class ProductStockDTO {

    private Long id;
    private Long productId;
    private Long warehouseId;
    private String warehouseName;
    private Integer currentStock;
    private Integer openingStock;
    private Integer reorderLevel;
    // IN_STOCK / LOW_STOCK / OUT_OF_STOCK
    private String stockStatus;

    public ProductStockDTO() {}

    /**
     * Compute stock status from current stock vs reorder level.
     */
    public static String computeStockStatus(int currentStock, int reorderLevel) {
        if (currentStock <= 0) return "OUT_OF_STOCK";
        if (currentStock <= reorderLevel) return "LOW_STOCK";
        return "IN_STOCK";
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public String getWarehouseName() { return warehouseName; }
    public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }

    public Integer getCurrentStock() { return currentStock; }
    public void setCurrentStock(Integer currentStock) { this.currentStock = currentStock; }

    public Integer getOpeningStock() { return openingStock; }
    public void setOpeningStock(Integer openingStock) { this.openingStock = openingStock; }

    public Integer getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; }

    public String getStockStatus() { return stockStatus; }
    public void setStockStatus(String stockStatus) { this.stockStatus = stockStatus; }
}
