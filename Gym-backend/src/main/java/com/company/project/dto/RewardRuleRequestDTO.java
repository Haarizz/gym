package com.company.project.dto;

import java.math.BigDecimal;

public class RewardRuleRequestDTO {

    private String name;
    private String type;
    private BigDecimal value;
    private String unit;
    private String eligibility;
    private String conditionTrigger;
    private Boolean isActive;
    private Integer expiryDays;

    // Getters & Setters

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getEligibility() { return eligibility; }
    public void setEligibility(String eligibility) { this.eligibility = eligibility; }

    public String getConditionTrigger() { return conditionTrigger; }
    public void setConditionTrigger(String conditionTrigger) { this.conditionTrigger = conditionTrigger; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getExpiryDays() { return expiryDays; }
    public void setExpiryDays(Integer expiryDays) { this.expiryDays = expiryDays; }
}
