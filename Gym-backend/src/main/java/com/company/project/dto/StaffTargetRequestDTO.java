package com.company.project.dto;

import java.math.BigDecimal;

public class StaffTargetRequestDTO {
    private Long staffDbId;          // null for institution targets
    private String scope;            // individual / institution
    private String timeframe;        // monthly / quarterly / yearly / custom
    private Integer year;
    private Integer month;
    private String startDate;
    private String endDate;
    private BigDecimal revenueTarget;
    private Integer sessionsTarget;
    private Integer newClientsTarget;
    private String unitTargetsJson;  // raw JSON string

    public Long getStaffDbId() { return staffDbId; }
    public void setStaffDbId(Long staffDbId) { this.staffDbId = staffDbId; }
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
    public Integer getSessionsTarget() { return sessionsTarget; }
    public void setSessionsTarget(Integer sessionsTarget) { this.sessionsTarget = sessionsTarget; }
    public Integer getNewClientsTarget() { return newClientsTarget; }
    public void setNewClientsTarget(Integer newClientsTarget) { this.newClientsTarget = newClientsTarget; }
    public String getUnitTargetsJson() { return unitTargetsJson; }
    public void setUnitTargetsJson(String unitTargetsJson) { this.unitTargetsJson = unitTargetsJson; }
}
