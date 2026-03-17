package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ProductionOrderRequestDTO {

    private Long recipeId;
    private BigDecimal quantityToProduce;
    private String outputUnit;
    private LocalDate scheduledDate;
    private Long warehouseId;
    private String notes;

    public ProductionOrderRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getRecipeId() { return recipeId; }
    public void setRecipeId(Long recipeId) { this.recipeId = recipeId; }

    public BigDecimal getQuantityToProduce() { return quantityToProduce; }
    public void setQuantityToProduce(BigDecimal quantityToProduce) { this.quantityToProduce = quantityToProduce; }

    public String getOutputUnit() { return outputUnit; }
    public void setOutputUnit(String outputUnit) { this.outputUnit = outputUnit; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
