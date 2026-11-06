package com.company.project.performance.incentives;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * One commission line: "5% of admission revenue" (percent_of_amount) or "₹150 per PT session"
 * (fixed_per_unit). Optional minimum units before the line pays at all, and a monthly cap.
 */
@Entity
@Table(name = "incentive_plan_lines")
public class IncentivePlanLine {

    public static final String PERCENT_OF_AMOUNT = "percent_of_amount";
    public static final String FIXED_PER_UNIT = "fixed_per_unit";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private IncentivePlan plan;

    @Column(name = "metric", nullable = false, length = 40)
    private String metric;

    @Column(name = "basis", nullable = false, length = 20)
    private String basis;

    @Column(name = "rate", nullable = false, precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(name = "min_units")
    private Integer minUnits;

    @Column(name = "cap_amount", precision = 12, scale = 2)
    private BigDecimal capAmount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public IncentivePlan getPlan() { return plan; }
    public void setPlan(IncentivePlan plan) { this.plan = plan; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getBasis() { return basis; }
    public void setBasis(String basis) { this.basis = basis; }
    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
    public Integer getMinUnits() { return minUnits; }
    public void setMinUnits(Integer minUnits) { this.minUnits = minUnits; }
    public BigDecimal getCapAmount() { return capAmount; }
    public void setCapAmount(BigDecimal capAmount) { this.capAmount = capAmount; }
}
