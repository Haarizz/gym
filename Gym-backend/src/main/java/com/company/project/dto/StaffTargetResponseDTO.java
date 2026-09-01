package com.company.project.dto;

import com.company.project.entities.StaffTarget;
import java.math.BigDecimal;

public class StaffTargetResponseDTO {
    private String id;
    private String staffDbId;
    private String staffId;
    private String staffName;
    private String staffRole;
    private String staffDepartment;
    private String scope;
    private String timeframe;
    private Integer year;
    private Integer month;
    private String startDate;
    private String endDate;
    private BigDecimal revenueTarget;
    private BigDecimal revenueAchieved;
    private Integer percentage;
    private Integer sessionsTarget;
    private Integer sessionsAchieved;
    private Integer newClientsTarget;
    private Integer newClientsAchieved;
    private String unitTargetsJson;
    private BigDecimal commissionEarned;
    private String trend;
    private Integer forecast;
    private String createdAt;

    public static StaffTargetResponseDTO fromEntity(StaffTarget t) {
        StaffTargetResponseDTO dto = new StaffTargetResponseDTO();
        dto.id = String.valueOf(t.getId());
        dto.scope = t.getScope();
        dto.timeframe = t.getTimeframe();
        dto.year = t.getYear();
        dto.month = t.getMonth();
        dto.startDate = t.getStartDate() != null ? t.getStartDate().toString() : null;
        dto.endDate = t.getEndDate() != null ? t.getEndDate().toString() : null;
        dto.revenueTarget = t.getRevenueTarget();
        dto.revenueAchieved = t.getRevenueAchieved() != null ? t.getRevenueAchieved() : BigDecimal.ZERO;
        dto.sessionsTarget = t.getSessionsTarget();
        dto.sessionsAchieved = t.getSessionsAchieved() != null ? t.getSessionsAchieved() : 0;
        dto.newClientsTarget = t.getNewClientsTarget();
        dto.newClientsAchieved = t.getNewClientsAchieved() != null ? t.getNewClientsAchieved() : 0;
        dto.unitTargetsJson = t.getUnitTargetsJson();
        dto.commissionEarned = t.getCommissionEarned() != null ? t.getCommissionEarned() : BigDecimal.ZERO;
        dto.trend = t.getTrend();
        dto.forecast = t.getForecast();
        dto.createdAt = t.getCreatedAt() != null ? t.getCreatedAt().toString() : null;

        // compute percentage
        if (t.getRevenueTarget() != null && t.getRevenueTarget().compareTo(BigDecimal.ZERO) > 0
                && t.getRevenueAchieved() != null) {
            dto.percentage = t.getRevenueAchieved()
                    .multiply(java.math.BigDecimal.valueOf(100))
                    .divide(t.getRevenueTarget(), 0, java.math.RoundingMode.HALF_UP)
                    .intValue();
        } else {
            dto.percentage = 0;
        }

        if (t.getStaff() != null) {
            dto.staffDbId = String.valueOf(t.getStaff().getId());
            dto.staffId = t.getStaff().getStaffId();
            dto.staffName = t.getStaff().getName();
            dto.staffRole = t.getStaff().getRole();
            dto.staffDepartment = t.getStaff().getDepartment();
        }

        return dto;
    }

    /**
     * Builds the DTO with "achieved" figures floored at live-computed progress (actual paid
     * receipts / converted leads for the period), so the reported percentage never understates
     * real performance even when nobody has manually pushed a PATCH .../achievement update.
     */
    public static StaffTargetResponseDTO fromEntity(StaffTarget t, BigDecimal liveRevenueAchieved, Integer liveConversions) {
        return fromEntity(t, liveRevenueAchieved, liveConversions, null);
    }

    public static StaffTargetResponseDTO fromEntity(StaffTarget t, BigDecimal liveRevenueAchieved, Integer liveConversions, BigDecimal liveCommission) {
        StaffTargetResponseDTO dto = fromEntity(t);
        if (liveRevenueAchieved != null && liveRevenueAchieved.compareTo(dto.revenueAchieved) > 0) {
            dto.revenueAchieved = liveRevenueAchieved;
        }
        if (liveConversions != null && liveConversions > dto.newClientsAchieved) {
            dto.newClientsAchieved = liveConversions;
        }
        if (liveCommission != null && liveCommission.compareTo(dto.commissionEarned) > 0) {
            dto.commissionEarned = liveCommission;
        }
        if (t.getRevenueTarget() != null && t.getRevenueTarget().compareTo(BigDecimal.ZERO) > 0) {
            dto.percentage = dto.revenueAchieved
                    .multiply(BigDecimal.valueOf(100))
                    .divide(t.getRevenueTarget(), 0, java.math.RoundingMode.HALF_UP)
                    .intValue();
        }
        return dto;
    }

    // All getters/setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStaffDbId() { return staffDbId; }
    public void setStaffDbId(String staffDbId) { this.staffDbId = staffDbId; }
    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }
    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }
    public String getStaffRole() { return staffRole; }
    public void setStaffRole(String staffRole) { this.staffRole = staffRole; }
    public String getStaffDepartment() { return staffDepartment; }
    public void setStaffDepartment(String staffDepartment) { this.staffDepartment = staffDepartment; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getTimeframe() { return timeframe; }
    public void setTimeframe(String timeframe) { this.timeframe = timeframe; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
    public BigDecimal getRevenueTarget() { return revenueTarget; }
    public void setRevenueTarget(BigDecimal revenueTarget) { this.revenueTarget = revenueTarget; }
    public BigDecimal getRevenueAchieved() { return revenueAchieved; }
    public void setRevenueAchieved(BigDecimal revenueAchieved) { this.revenueAchieved = revenueAchieved; }
    public Integer getPercentage() { return percentage; }
    public void setPercentage(Integer percentage) { this.percentage = percentage; }
    public Integer getSessionsTarget() { return sessionsTarget; }
    public void setSessionsTarget(Integer sessionsTarget) { this.sessionsTarget = sessionsTarget; }
    public Integer getSessionsAchieved() { return sessionsAchieved; }
    public void setSessionsAchieved(Integer sessionsAchieved) { this.sessionsAchieved = sessionsAchieved; }
    public Integer getNewClientsTarget() { return newClientsTarget; }
    public void setNewClientsTarget(Integer newClientsTarget) { this.newClientsTarget = newClientsTarget; }
    public Integer getNewClientsAchieved() { return newClientsAchieved; }
    public void setNewClientsAchieved(Integer newClientsAchieved) { this.newClientsAchieved = newClientsAchieved; }
    public String getUnitTargetsJson() { return unitTargetsJson; }
    public void setUnitTargetsJson(String unitTargetsJson) { this.unitTargetsJson = unitTargetsJson; }
    public BigDecimal getCommissionEarned() { return commissionEarned; }
    public void setCommissionEarned(BigDecimal commissionEarned) { this.commissionEarned = commissionEarned; }
    public String getTrend() { return trend; }
    public void setTrend(String trend) { this.trend = trend; }
    public Integer getForecast() { return forecast; }
    public void setForecast(Integer forecast) { this.forecast = forecast; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
