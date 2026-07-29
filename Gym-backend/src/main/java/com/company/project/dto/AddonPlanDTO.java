package com.company.project.dto;

import com.company.project.entities.AddonPlan;

import java.math.BigDecimal;

public class AddonPlanDTO {

    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer validity;
    private String category;
    private Boolean isActive;

    public AddonPlanDTO() {}

    public static AddonPlanDTO fromEntity(AddonPlan a) {
        AddonPlanDTO dto = new AddonPlanDTO();
        dto.setId(a.getId());
        dto.setName(a.getName());
        dto.setDescription(a.getDescription());
        dto.setPrice(a.getPrice());
        dto.setValidity(a.getValidity());
        dto.setCategory(a.getCategory());
        dto.setIsActive(a.getIsActive());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getValidity() { return validity; }
    public void setValidity(Integer validity) { this.validity = validity; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
