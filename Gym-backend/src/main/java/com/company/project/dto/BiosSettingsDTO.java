package com.company.project.dto;

import java.math.BigDecimal;

public class BiosSettingsDTO {

    private BigDecimal monthlyRevenueTarget;
    private Double dailyCheckInTargetPercent;
    private Boolean alertEnabled;
    private String alertEmail;
    private Double alertRetentionThreshold;
    private Boolean scheduleEnabled;
    private String scheduleEmail;
    private String scheduleFrequency;
    private Boolean revenueAlertEnabled;
    private Double revenueAlertThresholdPercent;
    private BigDecimal benchmarkRevenuePerMember;
    private Double benchmarkRetentionPercent;
    private Double benchmarkClassUtilizationPercent;
    private Double benchmarkStaffEfficiencyPercent;
    private Double benchmarkOperatingMarginPercent;

    public BiosSettingsDTO() {}

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

    public BigDecimal getBenchmarkRevenuePerMember() { return benchmarkRevenuePerMember; }
    public void setBenchmarkRevenuePerMember(BigDecimal benchmarkRevenuePerMember) { this.benchmarkRevenuePerMember = benchmarkRevenuePerMember; }

    public Double getBenchmarkRetentionPercent() { return benchmarkRetentionPercent; }
    public void setBenchmarkRetentionPercent(Double benchmarkRetentionPercent) { this.benchmarkRetentionPercent = benchmarkRetentionPercent; }

    public Double getBenchmarkClassUtilizationPercent() { return benchmarkClassUtilizationPercent; }
    public void setBenchmarkClassUtilizationPercent(Double benchmarkClassUtilizationPercent) { this.benchmarkClassUtilizationPercent = benchmarkClassUtilizationPercent; }

    public Double getBenchmarkStaffEfficiencyPercent() { return benchmarkStaffEfficiencyPercent; }
    public void setBenchmarkStaffEfficiencyPercent(Double benchmarkStaffEfficiencyPercent) { this.benchmarkStaffEfficiencyPercent = benchmarkStaffEfficiencyPercent; }

    public Double getBenchmarkOperatingMarginPercent() { return benchmarkOperatingMarginPercent; }
    public void setBenchmarkOperatingMarginPercent(Double benchmarkOperatingMarginPercent) { this.benchmarkOperatingMarginPercent = benchmarkOperatingMarginPercent; }
}
