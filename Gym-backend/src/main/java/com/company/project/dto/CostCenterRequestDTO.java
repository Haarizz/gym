package com.company.project.dto;

import java.math.BigDecimal;

public class CostCenterRequestDTO {

    private String code;
    private String name;
    private String branch;
    private String manager;
    private String description;
    private BigDecimal budget;
    private Boolean isActive;

    public CostCenterRequestDTO() {}

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

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
