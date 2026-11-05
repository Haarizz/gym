package com.company.project.performance.targets;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.math.BigDecimal;

/** One goal on a target: e.g. MEMBER_ADMISSION count 12, or POS_SALE amount 80,000. */
@Entity
@Table(name = "target_lines")
public class TargetLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private Target target;

    @Column(name = "metric", nullable = false, length = 40)
    private String metric;

    /** count | amount */
    @Column(name = "measure", nullable = false, length = 10)
    private String measure;

    @Column(name = "goal", nullable = false, precision = 14, scale = 2)
    private BigDecimal goal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Target getTarget() { return target; }
    public void setTarget(Target target) { this.target = target; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getMeasure() { return measure; }
    public void setMeasure(String measure) { this.measure = measure; }
    public BigDecimal getGoal() { return goal; }
    public void setGoal(BigDecimal goal) { this.goal = goal; }
}
