package com.company.project.dto;

import com.company.project.entities.ProductBrand;

public class ProductBrandDTO {

    private Long id;
    private String name;
    private String description;
    private String website;
    private String color;
    private Boolean isActive;
    private Integer productCount;

    public ProductBrandDTO() {}

    public static ProductBrandDTO fromEntity(ProductBrand b, int count) {
        ProductBrandDTO dto = new ProductBrandDTO();
        dto.setId(b.getId());
        dto.setName(b.getName());
        dto.setDescription(b.getDescription());
        dto.setWebsite(b.getWebsite());
        dto.setColor(b.getColor());
        dto.setIsActive(b.getIsActive() == null || b.getIsActive());
        dto.setProductCount(count);
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getProductCount() { return productCount; }
    public void setProductCount(Integer productCount) { this.productCount = productCount; }
}
