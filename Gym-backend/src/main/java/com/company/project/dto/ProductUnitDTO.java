package com.company.project.dto;

import com.company.project.entities.ProductUnit;
import java.math.BigDecimal;

public class ProductUnitDTO {

    private Long id;
    private String unit;
    private BigDecimal conversionFactor;
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private String barcode;

    public ProductUnitDTO() {}

    public static ProductUnitDTO fromEntity(ProductUnit e) {
        ProductUnitDTO dto = new ProductUnitDTO();
        dto.setId(e.getId());
        dto.setUnit(e.getUnit());
        dto.setConversionFactor(e.getConversionFactor());
        dto.setCostPrice(e.getCostPrice());
        dto.setSellingPrice(e.getSellingPrice());
        dto.setBarcode(e.getBarcode());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getConversionFactor() { return conversionFactor; }
    public void setConversionFactor(BigDecimal conversionFactor) { this.conversionFactor = conversionFactor; }

    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
}
