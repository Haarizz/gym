package com.company.project.dto;

import com.company.project.entities.CostCenter;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

public class CostCenterResponseDTO {

    private Long id;
    private String code;
    private String name;
    private String branch;
    private String manager;
    private String description;
    private BigDecimal budget;
    private BigDecimal spent;
    private Double utilization;
    private Boolean isActive;
    private int linkedAccounts;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public CostCenterResponseDTO() {}

    public static CostCenterResponseDTO fromEntity(CostCenter c, int linkedAccounts) {
        CostCenterResponseDTO dto = new CostCenterResponseDTO();
        dto.setId(c.getId());
        dto.setCode(c.getCode());
        dto.setName(c.getName());
        dto.setBranch(c.getBranch());
        dto.setManager(c.getManager());
        dto.setDescription(c.getDescription());
        dto.setBudget(c.getBudget() != null ? c.getBudget() : BigDecimal.ZERO);
        dto.setSpent(c.getSpent() != null ? c.getSpent() : BigDecimal.ZERO);
        BigDecimal budget = c.getBudget() != null ? c.getBudget() : BigDecimal.ZERO;
        BigDecimal spent = c.getSpent() != null ? c.getSpent() : BigDecimal.ZERO;
        double utilization = budget.compareTo(BigDecimal.ZERO) > 0
                ? spent.divide(budget, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;
        dto.setUtilization(Math.min(100.0, utilization));
        dto.setIsActive(c.getIsActive());
        dto.setLinkedAccounts(linkedAccounts);
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getManager() { return manager; }
    public void setManager(String manager) { this.manager = manager; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public BigDecimal getSpent() { return spent; }
    public void setSpent(BigDecimal spent) { this.spent = spent; }

    public Double getUtilization() { return utilization; }
    public void setUtilization(Double utilization) { this.utilization = utilization; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public int getLinkedAccounts() { return linkedAccounts; }
    public void setLinkedAccounts(int linkedAccounts) { this.linkedAccounts = linkedAccounts; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
