package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "production_orders")
public class ProductionOrder extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", unique = true)
    private String orderNumber;

    @Column(name = "recipe_id")
    private Long recipeId;

    @Column(name = "recipe_name")
    private String recipeName;

    @Column(name = "quantity_to_produce", precision = 10, scale = 2)
    private BigDecimal quantityToProduce;

    @Column(name = "output_unit")
    private String outputUnit;

    @Column(name = "output_product_id")
    private Long outputProductId;

    @Column(name = "output_product_name")
    private String outputProductName;

    // DRAFT | IN_PROGRESS | COMPLETED | CANCELLED
    @Column(name = "status")
    private String status = "DRAFT";

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "total_ingredient_cost", precision = 12, scale = 2)
    private BigDecimal totalIngredientCost = BigDecimal.ZERO;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public ProductionOrder() {}

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
}
