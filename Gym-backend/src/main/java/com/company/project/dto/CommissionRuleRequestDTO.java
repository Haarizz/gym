package com.company.project.dto;

import java.math.BigDecimal;

public class CommissionRuleRequestDTO {
    private String role;
    private BigDecimal baseCommission;
    private String targetBonusesJson;  // raw JSON string

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public BigDecimal getBaseCommission() { return baseCommission; }
    public void setBaseCommission(BigDecimal baseCommission) { this.baseCommission = baseCommission; }
    public String getTargetBonusesJson() { return targetBonusesJson; }
    public void setTargetBonusesJson(String targetBonusesJson) { this.targetBonusesJson = targetBonusesJson; }
}
