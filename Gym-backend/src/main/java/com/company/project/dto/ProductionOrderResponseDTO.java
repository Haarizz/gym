package com.company.project.dto;

import com.company.project.entities.ProductionOrder;
import com.company.project.entities.RecipeIngredient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ProductionOrderResponseDTO {

    private Long id;
    private String orderNumber;
    private Long recipeId;
    private String recipeName;
    private BigDecimal quantityToProduce;
    private String outputUnit;
    private Long outputProductId;
    private String outputProductName;
    private String status;
    private LocalDate scheduledDate;
    private LocalDate completedDate;
    private Long warehouseId;
    private BigDecimal totalIngredientCost;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private List<RecipeIngredientDTO> ingredients;

    public ProductionOrderResponseDTO() {}

    public static ProductionOrderResponseDTO fromEntity(ProductionOrder order,
                                                        List<RecipeIngredient> recipeIngredients,
                                                        BigDecimal scaleFactor) {
        ProductionOrderResponseDTO dto = new ProductionOrderResponseDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setRecipeId(order.getRecipeId());
        dto.setRecipeName(order.getRecipeName());
        dto.setQuantityToProduce(order.getQuantityToProduce());
        dto.setOutputUnit(order.getOutputUnit());
        dto.setOutputProductId(order.getOutputProductId());
        dto.setOutputProductName(order.getOutputProductName());
        dto.setStatus(order.getStatus());
        dto.setScheduledDate(order.getScheduledDate());
        dto.setCompletedDate(order.getCompletedDate());
        dto.setWarehouseId(order.getWarehouseId());
        dto.setTotalIngredientCost(order.getTotalIngredientCost());
        dto.setNotes(order.getNotes());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setCreatedBy(order.getCreatedBy());

        // Scale ingredients by scaleFactor
        BigDecimal factor = scaleFactor != null ? scaleFactor : BigDecimal.ONE;
        List<RecipeIngredientDTO> scaled = recipeIngredients.stream().map(ing -> {
            RecipeIngredientDTO d = new RecipeIngredientDTO();
            d.setId(ing.getId());
            d.setRecipeId(ing.getRecipeId());
            d.setProductId(ing.getProductId());
            d.setProductName(ing.getProductName());
            d.setSku(ing.getSku());
            BigDecimal scaledQty = (ing.getQuantity() != null ? ing.getQuantity() : BigDecimal.ZERO)
                    .multiply(factor)
                    .setScale(2, RoundingMode.HALF_UP);
            d.setQuantity(scaledQty);
            d.setUnit(ing.getUnit());
            d.setUnitCost(ing.getUnitCost());
            d.setNotes(ing.getNotes());
            return d;
        }).collect(Collectors.toList());
        dto.setIngredients(scaled);

        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Long getRecipeId() { return recipeId; }
    public void setRecipeId(Long recipeId) { this.recipeId = recipeId; }

    public String getRecipeName() { return recipeName; }
    public void setRecipeName(String recipeName) { this.recipeName = recipeName; }

    public BigDecimal getQuantityToProduce() { return quantityToProduce; }
    public void setQuantityToProduce(BigDecimal quantityToProduce) { this.quantityToProduce = quantityToProduce; }

    public String getOutputUnit() { return outputUnit; }
    public void setOutputUnit(String outputUnit) { this.outputUnit = outputUnit; }

    public Long getOutputProductId() { return outputProductId; }
    public void setOutputProductId(Long outputProductId) { this.outputProductId = outputProductId; }

    public String getOutputProductName() { return outputProductName; }
    public void setOutputProductName(String outputProductName) { this.outputProductName = outputProductName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public LocalDate getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDate completedDate) { this.completedDate = completedDate; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public BigDecimal getTotalIngredientCost() { return totalIngredientCost; }
    public void setTotalIngredientCost(BigDecimal totalIngredientCost) { this.totalIngredientCost = totalIngredientCost; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public List<RecipeIngredientDTO> getIngredients() { return ingredients; }
    public void setIngredients(List<RecipeIngredientDTO> ingredients) { this.ingredients = ingredients; }
}
