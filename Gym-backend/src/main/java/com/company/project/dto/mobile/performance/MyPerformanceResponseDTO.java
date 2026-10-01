package com.company.project.dto.mobile.performance;

import java.math.BigDecimal;

/**
 * Month-to-date performance for the "My Performance" screen in the mobile profile menu.
 * Trainers get session metrics (classesCompleted / sessionsTarget / sessionGrowth), staff get
 * lead metrics (leadsConverted / conversionTarget / conversionRate / conversionGrowth /
 * followUpCompletion); fields for the other role are null. Percentages are null when there
 * is nothing to compare against (no target set, no schedule, no previous-month activity).
 */
public class MyPerformanceResponseDTO {

    private String role;
    private String periodLabel;
    private Integer performanceScore;

    // Trainer metrics
    private Integer classesCompleted;
    private Integer sessionsTarget;
    private Integer sessionTargetPercentage;
    private Integer sessionGrowth;

    // Staff metrics
    private Integer leadsConverted;
    private Integer conversionTarget;
    private Integer conversionRate;
    private Integer conversionGrowth;
    private Integer followUpCompletion;

    // Shared metrics
    private double hoursWorked;
    private int daysPresent;
    private int daysScheduled;
    private Integer attendanceRate;
    private BigDecimal revenueAchieved = BigDecimal.ZERO;
    private BigDecimal revenueTarget = BigDecimal.ZERO;
    private Integer revenueGrowth;
    private String message;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }
    public Integer getPerformanceScore() { return performanceScore; }
    public void setPerformanceScore(Integer performanceScore) { this.performanceScore = performanceScore; }

    public Integer getClassesCompleted() { return classesCompleted; }
    public void setClassesCompleted(Integer classesCompleted) { this.classesCompleted = classesCompleted; }
    public Integer getSessionsTarget() { return sessionsTarget; }
    public void setSessionsTarget(Integer sessionsTarget) { this.sessionsTarget = sessionsTarget; }
    public Integer getSessionTargetPercentage() { return sessionTargetPercentage; }
    public void setSessionTargetPercentage(Integer sessionTargetPercentage) { this.sessionTargetPercentage = sessionTargetPercentage; }
    public Integer getSessionGrowth() { return sessionGrowth; }
    public void setSessionGrowth(Integer sessionGrowth) { this.sessionGrowth = sessionGrowth; }

    public Integer getLeadsConverted() { return leadsConverted; }
    public void setLeadsConverted(Integer leadsConverted) { this.leadsConverted = leadsConverted; }
    public Integer getConversionTarget() { return conversionTarget; }
    public void setConversionTarget(Integer conversionTarget) { this.conversionTarget = conversionTarget; }
    public Integer getConversionRate() { return conversionRate; }
    public void setConversionRate(Integer conversionRate) { this.conversionRate = conversionRate; }
    public Integer getConversionGrowth() { return conversionGrowth; }
    public void setConversionGrowth(Integer conversionGrowth) { this.conversionGrowth = conversionGrowth; }
    public Integer getFollowUpCompletion() { return followUpCompletion; }
    public void setFollowUpCompletion(Integer followUpCompletion) { this.followUpCompletion = followUpCompletion; }

    public double getHoursWorked() { return hoursWorked; }
    public void setHoursWorked(double hoursWorked) { this.hoursWorked = hoursWorked; }
    public int getDaysPresent() { return daysPresent; }
    public void setDaysPresent(int daysPresent) { this.daysPresent = daysPresent; }
    public int getDaysScheduled() { return daysScheduled; }
    public void setDaysScheduled(int daysScheduled) { this.daysScheduled = daysScheduled; }
    public Integer getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(Integer attendanceRate) { this.attendanceRate = attendanceRate; }
    public BigDecimal getRevenueAchieved() { return revenueAchieved; }
    public void setRevenueAchieved(BigDecimal revenueAchieved) { this.revenueAchieved = revenueAchieved != null ? revenueAchieved : BigDecimal.ZERO; }
    public BigDecimal getRevenueTarget() { return revenueTarget; }
    public void setRevenueTarget(BigDecimal revenueTarget) { this.revenueTarget = revenueTarget != null ? revenueTarget : BigDecimal.ZERO; }
    public Integer getRevenueGrowth() { return revenueGrowth; }
    public void setRevenueGrowth(Integer revenueGrowth) { this.revenueGrowth = revenueGrowth; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
