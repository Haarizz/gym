package com.company.project.dto;

import com.company.project.entities.Recipe;
import com.company.project.entities.RecipeIngredient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class RecipeResponseDTO {

    private Long id;
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
    private BigDecimal estimatedCost;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    public RecipeResponseDTO() {}

    public static RecipeResponseDTO fromEntity(Recipe recipe, List<RecipeIngredient> ingredients) {
        RecipeResponseDTO dto = new RecipeResponseDTO();
        dto.setId(recipe.getId());
        dto.setName(recipe.getName());
        dto.setDescription(recipe.getDescription());
        dto.setCategoryId(recipe.getCategoryId());
        dto.setCategoryName(recipe.getCategoryName());
        dto.setOutputProductId(recipe.getOutputProductId());
        dto.setOutputProductName(recipe.getOutputProductName());
        dto.setOutputQuantity(recipe.getOutputQuantity());
        dto.setOutputUnit(recipe.getOutputUnit());
        dto.setPrepTimeMinutes(recipe.getPrepTimeMinutes());
        dto.setStatus(recipe.getStatus());
        dto.setNotes(recipe.getNotes());
        dto.setCreatedAt(recipe.getCreatedAt());
        dto.setUpdatedAt(recipe.getUpdatedAt());
        dto.setCreatedBy(recipe.getCreatedBy());
        dto.setItems(ingredients.stream().map(RecipeIngredientDTO::fromEntity).collect(Collectors.toList()));

        // Compute estimated cost = sum(quantity * unitCost)
        BigDecimal cost = ingredients.stream()
                .map(i -> {
                    BigDecimal q = i.getQuantity() != null ? i.getQuantity() : BigDecimal.ZERO;
                    BigDecimal u = i.getUnitCost() != null ? i.getUnitCost() : BigDecimal.ZERO;
                    return q.multiply(u);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setEstimatedCost(cost);

        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public BigDecimal getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(BigDecimal estimatedCost) { this.estimatedCost = estimatedCost; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}
