package com.company.project.dto;

import java.math.BigDecimal;

public class ProductStatsDTO {

    private Long totalProducts;
    private Long activeProducts;
    private Long lowStockItems;
    private Long outOfStockItems;
    private BigDecimal totalInventoryValue;
    private Long categoriesCount;

    public ProductStatsDTO() {}

    public ProductStatsDTO(Long totalProducts, Long activeProducts, Long lowStockItems,
                           Long outOfStockItems, BigDecimal totalInventoryValue, Long categoriesCount) {
        this.totalProducts = totalProducts;
        this.activeProducts = activeProducts;
        this.lowStockItems = lowStockItems;
        this.outOfStockItems = outOfStockItems;
        this.totalInventoryValue = totalInventoryValue;
        this.categoriesCount = categoriesCount;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getTotalProducts() { return totalProducts; }
    public void setTotalProducts(Long totalProducts) { this.totalProducts = totalProducts; }

    public Long getActiveProducts() { return activeProducts; }
    public void setActiveProducts(Long activeProducts) { this.activeProducts = activeProducts; }

    public Long getLowStockItems() { return lowStockItems; }
    public void setLowStockItems(Long lowStockItems) { this.lowStockItems = lowStockItems; }

    public Long getOutOfStockItems() { return outOfStockItems; }
    public void setOutOfStockItems(Long outOfStockItems) { this.outOfStockItems = outOfStockItems; }

    public BigDecimal getTotalInventoryValue() { return totalInventoryValue; }
    public void setTotalInventoryValue(BigDecimal totalInventoryValue) { this.totalInventoryValue = totalInventoryValue; }

    public Long getCategoriesCount() { return categoriesCount; }
    public void setCategoriesCount(Long categoriesCount) { this.categoriesCount = categoriesCount; }
}
