package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "recipes")
public class Recipe extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name")
    private String categoryName;

    @Column(name = "output_product_id")
    private Long outputProductId;

    @Column(name = "output_product_name")
    private String outputProductName;

    @Column(name = "output_quantity", precision = 10, scale = 2)
    private BigDecimal outputQuantity;

    @Column(name = "output_unit")
    private String outputUnit;

    @Column(name = "prep_time_minutes")
    private Integer prepTimeMinutes;

    // ACTIVE | INACTIVE
    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public Recipe() {}

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
}
