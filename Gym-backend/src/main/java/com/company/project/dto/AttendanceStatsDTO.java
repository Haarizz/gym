package com.company.project.dto;

import java.util.List;
import java.util.Map;

public class AttendanceStatsDTO {

    private long todayVisits;
    private long activeNow;
    private double avgDurationMinutes;
    private String peakHour;            // e.g. "6:00 PM"
    private double attendanceRate;      // percentage of active members who visited today
    private long totalActiveMembers;

    // For the weekly bar chart: [{day:"Mon", visits:45}, ...]
    private List<Map<String, Object>> weeklyTrend;

    // For the monthly line chart: [{month:"Jan", visits:1230}, ...]
    private List<Map<String, Object>> monthlyTrend;

    public long getTodayVisits() { return todayVisits; }
    public void setTodayVisits(long todayVisits) { this.todayVisits = todayVisits; }

    public long getActiveNow() { return activeNow; }
    public void setActiveNow(long activeNow) { this.activeNow = activeNow; }

    public double getAvgDurationMinutes() { return avgDurationMinutes; }
    public void setAvgDurationMinutes(double avgDurationMinutes) { this.avgDurationMinutes = avgDurationMinutes; }

    public String getPeakHour() { return peakHour; }
    public void setPeakHour(String peakHour) { this.peakHour = peakHour; }

    public double getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(double attendanceRate) { this.attendanceRate = attendanceRate; }

    public long getTotalActiveMembers() { return totalActiveMembers; }
    public void setTotalActiveMembers(long totalActiveMembers) { this.totalActiveMembers = totalActiveMembers; }

    public List<Map<String, Object>> getWeeklyTrend() { return weeklyTrend; }
    public void setWeeklyTrend(List<Map<String, Object>> weeklyTrend) { this.weeklyTrend = weeklyTrend; }

    public List<Map<String, Object>> getMonthlyTrend() { return monthlyTrend; }
    public void setMonthlyTrend(List<Map<String, Object>> monthlyTrend) { this.monthlyTrend = monthlyTrend; }
}
