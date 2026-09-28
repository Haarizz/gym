package com.company.project.dto;

import java.math.BigDecimal;

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
    private int achievementPercentage;
    private int conversionRate;
    private int ptSessions;
    private int attendanceRate;
    private double rating;
    private int ratingCount;
    private boolean presentToday;
    private String performanceStatus;

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }
    public BigDecimal getRevenueTarget() { return revenueTarget; }
    public void setRevenueTarget(BigDecimal revenueTarget) { this.revenueTarget = revenueTarget; }
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
