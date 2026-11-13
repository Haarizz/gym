package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Current-month performance snapshot for one staff member, shown on the admin
 * Staff Management list (target achievement, conversion, PT, attendance, rating).
 */
public class StaffPerformanceMetricsDTO {

    // EXCELLENT (target met) | ON_TRACK (pacing to target) | AT_RISK (behind pace) | NO_TARGET
    public static final String EXCELLENT = "EXCELLENT";
    public static final String ON_TRACK  = "ON_TRACK";
    public static final String AT_RISK   = "AT_RISK";
    public static final String NO_TARGET = "NO_TARGET";

    private String staffId;
    private BigDecimal revenueTarget;
    private BigDecimal revenueAchieved;
    /** This month's commission: membership sales at the role's rates plus POS sales at its POS rates. */
    private BigDecimal commissionEarned;
    private int achievementPercentage;
    private int conversionRate;
    private int ptSessions;
    private int attendanceRate;
    private double rating;
    private int ratingCount;
    private boolean presentToday;
    private String performanceStatus;

    // Performance engine figures for the month (see performance.metric.Metric).
    private String period;
    private long admissions;
    private BigDecimal admissionsAmount = BigDecimal.ZERO;
    private long leadConversions;
    private long posSales;
    private BigDecimal posSalesAmount = BigDecimal.ZERO;
    private long ptSales;
    private BigDecimal ptSalesAmount = BigDecimal.ZERO;
    private long ptSessionsDelivered;
    private long classesTaught;
    private long classAttendees;
    /** Every goal that applies this month (staff, role or branch target), with progress. Keys are snake_case. */
    private List<Map<String, Object>> goals = List.of();

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public long getAdmissions() { return admissions; }
    public void setAdmissions(long admissions) { this.admissions = admissions; }
    public BigDecimal getAdmissionsAmount() { return admissionsAmount; }
    public void setAdmissionsAmount(BigDecimal admissionsAmount) { this.admissionsAmount = admissionsAmount; }
    public long getLeadConversions() { return leadConversions; }
    public void setLeadConversions(long leadConversions) { this.leadConversions = leadConversions; }
    public long getPosSales() { return posSales; }
    public void setPosSales(long posSales) { this.posSales = posSales; }
    public BigDecimal getPosSalesAmount() { return posSalesAmount; }
    public void setPosSalesAmount(BigDecimal posSalesAmount) { this.posSalesAmount = posSalesAmount; }
    public long getPtSales() { return ptSales; }
    public void setPtSales(long ptSales) { this.ptSales = ptSales; }
    public BigDecimal getPtSalesAmount() { return ptSalesAmount; }
    public void setPtSalesAmount(BigDecimal ptSalesAmount) { this.ptSalesAmount = ptSalesAmount; }
    public long getPtSessionsDelivered() { return ptSessionsDelivered; }
    public void setPtSessionsDelivered(long ptSessionsDelivered) { this.ptSessionsDelivered = ptSessionsDelivered; }
    public long getClassesTaught() { return classesTaught; }
    public void setClassesTaught(long classesTaught) { this.classesTaught = classesTaught; }
    public long getClassAttendees() { return classAttendees; }
    public void setClassAttendees(long classAttendees) { this.classAttendees = classAttendees; }
    public List<Map<String, Object>> getGoals() { return goals; }
    public void setGoals(List<Map<String, Object>> goals) { this.goals = goals; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }
    public BigDecimal getRevenueTarget() { return revenueTarget; }
    public void setRevenueTarget(BigDecimal revenueTarget) { this.revenueTarget = revenueTarget; }
    public BigDecimal getCommissionEarned() { return commissionEarned; }
    public void setCommissionEarned(BigDecimal commissionEarned) { this.commissionEarned = commissionEarned; }
    public BigDecimal getRevenueAchieved() { return revenueAchieved; }
    public void setRevenueAchieved(BigDecimal revenueAchieved) { this.revenueAchieved = revenueAchieved; }
    public int getAchievementPercentage() { return achievementPercentage; }
    public void setAchievementPercentage(int achievementPercentage) { this.achievementPercentage = achievementPercentage; }
    public int getConversionRate() { return conversionRate; }
    public void setConversionRate(int conversionRate) { this.conversionRate = conversionRate; }
    public int getPtSessions() { return ptSessions; }
    public void setPtSessions(int ptSessions) { this.ptSessions = ptSessions; }
    public int getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(int attendanceRate) { this.attendanceRate = attendanceRate; }
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }
    public int getRatingCount() { return ratingCount; }
    public void setRatingCount(int ratingCount) { this.ratingCount = ratingCount; }
    public boolean isPresentToday() { return presentToday; }
    public void setPresentToday(boolean presentToday) { this.presentToday = presentToday; }
    public String getPerformanceStatus() { return performanceStatus; }
    public void setPerformanceStatus(String performanceStatus) { this.performanceStatus = performanceStatus; }
}
