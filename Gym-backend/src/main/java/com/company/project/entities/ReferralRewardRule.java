package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "referral_reward_rules")
public class ReferralRewardRule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // discount / credit / points / free_session
    @Column(name = "type")
    private String type;

    @Column(name = "value", precision = 10, scale = 2)
    private BigDecimal value;

    // AED, %, sessions, points
    @Column(name = "unit")
    private String unit;

    // referrer / referee / both
    @Column(name = "eligibility")
    private String eligibility;

    // signup / payment / both
    @Column(name = "condition_trigger", columnDefinition = "VARCHAR(50) DEFAULT 'signup'")
    private String conditionTrigger;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "expiry_days")
    private Integer expiryDays;

    public ReferralRewardRule() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
