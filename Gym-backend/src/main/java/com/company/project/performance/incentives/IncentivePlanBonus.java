package com.company.project.performance.incentives;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * A target-attainment bonus: reaching threshold_pct of the goal on a metric (or REVENUE_TOTAL)
 * pays a fixed amount or a percentage of that metric's amount. Tiers on the same metric don't
 * stack — the highest threshold reached pays. An optional condition gates the bonus
 * ("only if CLASS_ATTENDEE ≥ 40").
 */
@Entity
@Table(name = "incentive_plan_bonuses")
public class IncentivePlanBonus {

    public static final String TARGET_ATTAINMENT = "target_attainment";
    public static final String FIXED = "fixed";
    public static final String PERCENT_OF_METRIC_AMOUNT = "percent_of_metric_amount";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private IncentivePlan plan;

    @Column(name = "trigger_type", nullable = false, length = 30)
    private String triggerType = TARGET_ATTAINMENT;

    @Column(name = "metric", nullable = false, length = 40)
    private String metric;

    @Column(name = "threshold_pct", nullable = false, precision = 7, scale = 2)
    private BigDecimal thresholdPct;

    @Column(name = "reward_type", nullable = false, length = 30)
    private String rewardType;

    @Column(name = "reward_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal rewardValue;

    @Column(name = "condition_metric", length = 40)
    private String conditionMetric;

    @Column(name = "condition_min", precision = 12, scale = 2)
    private BigDecimal conditionMin;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public IncentivePlan getPlan() { return plan; }
    public void setPlan(IncentivePlan plan) { this.plan = plan; }
    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public BigDecimal getThresholdPct() { return thresholdPct; }
    public void setThresholdPct(BigDecimal thresholdPct) { this.thresholdPct = thresholdPct; }
    public String getRewardType() { return rewardType; }
    public void setRewardType(String rewardType) { this.rewardType = rewardType; }
    public BigDecimal getRewardValue() { return rewardValue; }
    public void setRewardValue(BigDecimal rewardValue) { this.rewardValue = rewardValue; }
    public String getConditionMetric() { return conditionMetric; }
    public void setConditionMetric(String conditionMetric) { this.conditionMetric = conditionMetric; }
    public BigDecimal getConditionMin() { return conditionMin; }
    public void setConditionMin(BigDecimal conditionMin) { this.conditionMin = conditionMin; }
}
