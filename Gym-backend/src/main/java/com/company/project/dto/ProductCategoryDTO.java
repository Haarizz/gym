package com.company.project.dto;

import com.company.project.entities.ProductCategory;

public class ProductCategoryDTO {

    private Long id;
    private String name;
    private String categoryType;
    private String color;
    private String iconName;
    private Integer productCount;

    public ProductCategoryDTO() {}

    public static ProductCategoryDTO fromEntity(ProductCategory c, int count) {
        ProductCategoryDTO dto = new ProductCategoryDTO();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setCategoryType(c.getCategoryType());
        dto.setColor(c.getColor());
        dto.setIconName(c.getIconName());
        dto.setProductCount(count);
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategoryType() { return categoryType; }
    public void setCategoryType(String categoryType) { this.categoryType = categoryType; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public Integer getProductCount() { return productCount; }
    public void setProductCount(Integer productCount) { this.productCount = productCount; }
}
