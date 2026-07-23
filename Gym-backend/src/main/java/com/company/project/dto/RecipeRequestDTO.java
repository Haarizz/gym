package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class RecipeRequestDTO {

    private String name;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Long outputProductId;
    private String outputProductName;
    private BigDecimal outputQuantity;
    private String outputUnit;
    private Integer prepTimeMinutes;
    private String status;
    private String notes;
    private List<RecipeIngredientDTO> items;

    public RecipeRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public Long getOutputProductId() { return outputProductId; }
    public void setOutputProductId(Long outputProductId) { this.outputProductId = outputProductId; }

    public String getOutputProductName() { return outputProductName; }
    public void setOutputProductName(String outputProductName) { this.outputProductName = outputProductName; }

    public BigDecimal getOutputQuantity() { return outputQuantity; }
    public void setOutputQuantity(BigDecimal outputQuantity) { this.outputQuantity = outputQuantity; }

    public String getOutputUnit() { return outputUnit; }
    public void setOutputUnit(String outputUnit) { this.outputUnit = outputUnit; }

    public Integer getPrepTimeMinutes() { return prepTimeMinutes; }
    public void setPrepTimeMinutes(Integer prepTimeMinutes) { this.prepTimeMinutes = prepTimeMinutes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<RecipeIngredientDTO> getItems() { return items; }
    public void setItems(List<RecipeIngredientDTO> items) { this.items = items; }
}
