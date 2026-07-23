package com.company.project.dto;

import com.company.project.entities.Product;
import com.company.project.entities.ProductCategory;
import com.company.project.entities.ProductStock;
import com.company.project.entities.ProductUnit;
import com.company.project.entities.Warehouse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class ProductResponseDTO {

    private Long id;
    private String name;
    private String sku;
    private Long categoryId;
    private String categoryName;
    private String brand;
    private String description;
    private Boolean isActive;
    private Boolean hasVariants;
    private Boolean hasRecipe;
    private Boolean isManufactured;
    private Boolean enabledForPos;
    private List<String> imageUrls;
    private String barcode;
    private String barcodeTemplate;
    private String defaultUnit;
    private BigDecimal sellingPrice;
    private BigDecimal costPrice;
    private BigDecimal taxRate;
    private String supplier;
    private Integer totalStock;
    private BigDecimal inventoryValue;
    private List<ProductStockDTO> stockByWarehouse;
    private String stockStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProductUnitDTO> units;

    public ProductResponseDTO() {}

    public static ProductResponseDTO fromEntity(Product p,
                                                ProductCategory cat,
                                                List<ProductStock> stocks,
                                                List<Warehouse> warehouses,
                                                List<ProductUnit> units) {
        ProductResponseDTO dto = new ProductResponseDTO();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setSku(p.getSku());
        dto.setCategoryId(p.getCategoryId());
        dto.setCategoryName(cat != null ? cat.getName() : null);
        dto.setBrand(p.getBrand());
        dto.setDescription(p.getDescription());
        dto.setIsActive(p.getIsActive());
        dto.setHasVariants(p.getHasVariants());
        dto.setHasRecipe(p.getHasRecipe());
        dto.setIsManufactured(p.getIsManufactured());
        dto.setEnabledForPos(p.getEnabledForPos());
        dto.setImageUrls(p.getImageUrls());
        dto.setBarcode(p.getBarcode());
        dto.setBarcodeTemplate(p.getBarcodeTemplate());
        dto.setDefaultUnit(p.getDefaultUnit());
        dto.setSellingPrice(p.getSellingPrice());
        dto.setCostPrice(p.getCostPrice());
        dto.setTaxRate(p.getTaxRate());
        dto.setSupplier(p.getSupplier());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());

        // Build warehouse name lookup
        Map<Long, String> warehouseNames = warehouses.stream()
                .collect(Collectors.toMap(Warehouse::getId, Warehouse::getName));

        // Build stockByWarehouse list
        List<ProductStockDTO> stockDTOs = new ArrayList<>();
        int total = 0;
        int minReorderLevel = 0;
        boolean firstStock = true;

        for (ProductStock s : stocks) {
            int current = s.getCurrentStock() != null ? s.getCurrentStock() : 0;
            int reorder = s.getReorderLevel() != null ? s.getReorderLevel() : 0;
            total += current;

            if (firstStock) {
                minReorderLevel = reorder;
                firstStock = false;
            } else {
                minReorderLevel = Math.min(minReorderLevel, reorder);
            }

            ProductStockDTO stockDTO = new ProductStockDTO();
            stockDTO.setId(s.getId());
            stockDTO.setProductId(s.getProductId());
            stockDTO.setWarehouseId(s.getWarehouseId());
            stockDTO.setWarehouseName(warehouseNames.getOrDefault(s.getWarehouseId(), "Unknown"));
            stockDTO.setCurrentStock(current);
            stockDTO.setOpeningStock(s.getOpeningStock() != null ? s.getOpeningStock() : 0);
            stockDTO.setReorderLevel(reorder);
            stockDTO.setStockStatus(ProductStockDTO.computeStockStatus(current, reorder));
            stockDTOs.add(stockDTO);
        }

        dto.setTotalStock(total);
        dto.setStockByWarehouse(stockDTOs);

        // Inventory value = totalStock * costPrice
        BigDecimal costPrice = p.getCostPrice() != null ? p.getCostPrice() : BigDecimal.ZERO;
        dto.setInventoryValue(costPrice.multiply(new BigDecimal(total)));

        // Overall stock status
        if (Boolean.FALSE.equals(p.getIsActive())) {
            dto.setStockStatus("INACTIVE");
        } else if (total <= 0) {
            dto.setStockStatus("OUT_OF_STOCK");
        } else if (!firstStock && total <= minReorderLevel) {
            dto.setStockStatus("LOW_STOCK");
        } else {
            dto.setStockStatus("IN_STOCK");
        }

        dto.setUnits(units != null ? units.stream().map(ProductUnitDTO::fromEntity).collect(java.util.stream.Collectors.toList()) : new ArrayList<>());

        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getHasVariants() { return hasVariants; }
    public void setHasVariants(Boolean hasVariants) { this.hasVariants = hasVariants; }

    public Boolean getHasRecipe() { return hasRecipe; }
    public void setHasRecipe(Boolean hasRecipe) { this.hasRecipe = hasRecipe; }

    public Boolean getIsManufactured() { return isManufactured; }
    public void setIsManufactured(Boolean isManufactured) { this.isManufactured = isManufactured; }

    public Boolean getEnabledForPos() { return enabledForPos; }
    public void setEnabledForPos(Boolean enabledForPos) { this.enabledForPos = enabledForPos; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }

    public String getBarcodeTemplate() { return barcodeTemplate; }
    public void setBarcodeTemplate(String barcodeTemplate) { this.barcodeTemplate = barcodeTemplate; }

    public String getDefaultUnit() { return defaultUnit; }
    public void setDefaultUnit(String defaultUnit) { this.defaultUnit = defaultUnit; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }

    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public Integer getTotalStock() { return totalStock; }
    public void setTotalStock(Integer totalStock) { this.totalStock = totalStock; }

    public BigDecimal getInventoryValue() { return inventoryValue; }
    public void setInventoryValue(BigDecimal inventoryValue) { this.inventoryValue = inventoryValue; }

    public List<ProductStockDTO> getStockByWarehouse() { return stockByWarehouse; }
    public void setStockByWarehouse(List<ProductStockDTO> stockByWarehouse) { this.stockByWarehouse = stockByWarehouse; }

    public String getStockStatus() { return stockStatus; }
    public void setStockStatus(String stockStatus) { this.stockStatus = stockStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<ProductUnitDTO> getUnits() { return units; }
    public void setUnits(List<ProductUnitDTO> units) { this.units = units; }
}
