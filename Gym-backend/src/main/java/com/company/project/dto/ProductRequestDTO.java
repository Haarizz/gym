package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class ProductRequestDTO {

    private String name;
    private Long categoryId;
    private String brand;
    private String description;
    private Boolean isActive;
    private Boolean hasVariants;
    private Boolean hasRecipe;
    private Boolean isManufactured;
    private List<String> imageUrls;
    private String barcode;
    private String barcodeTemplate;
    private String defaultUnit;
    private BigDecimal sellingPrice;
    private BigDecimal costPrice;
    private BigDecimal taxRate;
    private String supplier;

    // Initial stock allocation
    private Integer openingStock;
    private Integer reorderLevel;
    private Long warehouseId;

    private List<ProductUnitDTO> units;

    public ProductRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

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

    public Integer getOpeningStock() { return openingStock; }
    public void setOpeningStock(Integer openingStock) { this.openingStock = openingStock; }

    public Integer getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public List<ProductUnitDTO> getUnits() { return units; }
    public void setUnits(List<ProductUnitDTO> units) { this.units = units; }
}
