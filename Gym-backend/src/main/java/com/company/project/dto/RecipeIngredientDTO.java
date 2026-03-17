package com.company.project.dto;

import com.company.project.entities.RecipeIngredient;

import java.math.BigDecimal;

public class RecipeIngredientDTO {

    private Long id;
    private Long recipeId;
    private Long productId;
    private String productName;
    private String sku;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal unitCost;
    private String notes;

    public RecipeIngredientDTO() {}

    public static RecipeIngredientDTO fromEntity(RecipeIngredient e) {
        RecipeIngredientDTO dto = new RecipeIngredientDTO();
        dto.setId(e.getId());
        dto.setRecipeId(e.getRecipeId());
        dto.setProductId(e.getProductId());
        dto.setProductName(e.getProductName());
        dto.setSku(e.getSku());
        dto.setQuantity(e.getQuantity());
        dto.setUnit(e.getUnit());
        dto.setUnitCost(e.getUnitCost());
        dto.setNotes(e.getNotes());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRecipeId() { return recipeId; }
    public void setRecipeId(Long recipeId) { this.recipeId = recipeId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
