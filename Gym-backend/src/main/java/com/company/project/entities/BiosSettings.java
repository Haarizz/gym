package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

// One row per branch holding the BiOS page's "Quick Analytics Actions"
// configuration — Set Targets / Set Alerts / Schedule Report / Configure
// were previously buttons with no onClick handler at all, so nothing they
// represented was ever actually stored or acted on. Was a single global
// singleton (fixed id=1) until targets/alerts/benchmarks were made branch-scoped.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "bios_settings")
public class BiosSettings extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @Column(name = "monthly_revenue_target", precision = 14, scale = 2)
    private BigDecimal monthlyRevenueTarget;

    @Column(name = "daily_checkin_target_percent")
    private Double dailyCheckInTargetPercent;

    @Column(name = "alert_enabled")
    private Boolean alertEnabled = false;

    @Column(name = "alert_email")
    private String alertEmail;

    @Column(name = "alert_retention_threshold")
    private Double alertRetentionThreshold = 80.0;

    @Column(name = "schedule_enabled")
    private Boolean scheduleEnabled = false;

    @Column(name = "schedule_email")
    private String scheduleEmail;

    @Column(name = "schedule_frequency")
    private String scheduleFrequency = "WEEKLY";

    // Revenue shortfall alert — separate from the retention alert above but
    // shares the same alertEmail recipient. Fires when month-to-date revenue,
    // projected to month-end at the current daily pace, falls short of
    // monthlyRevenueTarget by more than this percentage.
    @Column(name = "revenue_alert_enabled")
    private Boolean revenueAlertEnabled = false;

    @Column(name = "revenue_alert_threshold_percent")
    private Double revenueAlertThresholdPercent = 90.0;

    // Admin-entered comparison targets shown on the Benchmarking card — these
    // are the operator's own goals, not sourced from any external industry
    // data feed (there is no such integration in this app).
    @Column(name = "benchmark_revenue_per_member", precision = 12, scale = 2)
    private java.math.BigDecimal benchmarkRevenuePerMember;

    @Column(name = "benchmark_retention_percent")
    private Double benchmarkRetentionPercent;

    @Column(name = "benchmark_class_utilization_percent")
    private Double benchmarkClassUtilizationPercent;

    @Column(name = "benchmark_staff_efficiency_percent")
    private Double benchmarkStaffEfficiencyPercent;

    @Column(name = "benchmark_operating_margin_percent")
    private Double benchmarkOperatingMarginPercent;

    public BiosSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getMonthlyRevenueTarget() { return monthlyRevenueTarget; }
    public void setMonthlyRevenueTarget(BigDecimal monthlyRevenueTarget) { this.monthlyRevenueTarget = monthlyRevenueTarget; }

    public Double getDailyCheckInTargetPercent() { return dailyCheckInTargetPercent; }
    public void setDailyCheckInTargetPercent(Double dailyCheckInTargetPercent) { this.dailyCheckInTargetPercent = dailyCheckInTargetPercent; }

    public Boolean getAlertEnabled() { return alertEnabled; }
    public void setAlertEnabled(Boolean alertEnabled) { this.alertEnabled = alertEnabled; }

    public String getAlertEmail() { return alertEmail; }
    public void setAlertEmail(String alertEmail) { this.alertEmail = alertEmail; }

    public Double getAlertRetentionThreshold() { return alertRetentionThreshold; }
    public void setAlertRetentionThreshold(Double alertRetentionThreshold) { this.alertRetentionThreshold = alertRetentionThreshold; }

    public Boolean getScheduleEnabled() { return scheduleEnabled; }
    public void setScheduleEnabled(Boolean scheduleEnabled) { this.scheduleEnabled = scheduleEnabled; }

    public String getScheduleEmail() { return scheduleEmail; }
    public void setScheduleEmail(String scheduleEmail) { this.scheduleEmail = scheduleEmail; }

    public String getScheduleFrequency() { return scheduleFrequency; }
    public void setScheduleFrequency(String scheduleFrequency) { this.scheduleFrequency = scheduleFrequency; }

    public Boolean getRevenueAlertEnabled() { return revenueAlertEnabled; }
    public void setRevenueAlertEnabled(Boolean revenueAlertEnabled) { this.revenueAlertEnabled = revenueAlertEnabled; }

    public Double getRevenueAlertThresholdPercent() { return revenueAlertThresholdPercent; }
    public void setRevenueAlertThresholdPercent(Double revenueAlertThresholdPercent) { this.revenueAlertThresholdPercent = revenueAlertThresholdPercent; }

    public java.math.BigDecimal getBenchmarkRevenuePerMember() { return benchmarkRevenuePerMember; }
    public void setBenchmarkRevenuePerMember(java.math.BigDecimal benchmarkRevenuePerMember) { this.benchmarkRevenuePerMember = benchmarkRevenuePerMember; }

    public Double getBenchmarkRetentionPercent() { return benchmarkRetentionPercent; }
    public void setBenchmarkRetentionPercent(Double benchmarkRetentionPercent) { this.benchmarkRetentionPercent = benchmarkRetentionPercent; }

    public Double getBenchmarkClassUtilizationPercent() { return benchmarkClassUtilizationPercent; }
    public void setBenchmarkClassUtilizationPercent(Double benchmarkClassUtilizationPercent) { this.benchmarkClassUtilizationPercent = benchmarkClassUtilizationPercent; }

    public Double getBenchmarkStaffEfficiencyPercent() { return benchmarkStaffEfficiencyPercent; }
    public void setBenchmarkStaffEfficiencyPercent(Double benchmarkStaffEfficiencyPercent) { this.benchmarkStaffEfficiencyPercent = benchmarkStaffEfficiencyPercent; }

    public Double getBenchmarkOperatingMarginPercent() { return benchmarkOperatingMarginPercent; }
    public void setBenchmarkOperatingMarginPercent(Double benchmarkOperatingMarginPercent) { this.benchmarkOperatingMarginPercent = benchmarkOperatingMarginPercent; }
}
