package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "staff_targets")
public class StaffTarget extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // null for institution-wide targets
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "staff_db_id")
    private Staff staff;

    // individual / institution
    private String scope;

    // monthly / quarterly / yearly / custom
    private String timeframe;

    private Integer year;
    private Integer month;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "revenue_target", precision = 12, scale = 2)
    private BigDecimal revenueTarget;

    @Column(name = "revenue_achieved", precision = 12, scale = 2)
    private BigDecimal revenueAchieved = BigDecimal.ZERO;

    @Column(name = "sessions_target")
    private Integer sessionsTarget;

    @Column(name = "sessions_achieved")
    private Integer sessionsAchieved = 0;

    @Column(name = "new_clients_target")
    private Integer newClientsTarget;

    @Column(name = "new_clients_achieved")
    private Integer newClientsAchieved = 0;

    // JSON string: [{"service":"Karate","target_units":10,"achieved_units":6}]
    @Column(name = "unit_targets_json", columnDefinition = "TEXT")
    private String unitTargetsJson = "[]";

    @Column(name = "commission_earned", precision = 10, scale = 2)
    private BigDecimal commissionEarned = BigDecimal.ZERO;

    // up / down / stable
    private String trend = "stable";

    // forecast percentage
    private Integer forecast = 0;

    // getters/setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getTimeframe() { return timeframe; }
    public void setTimeframe(String timeframe) { this.timeframe = timeframe; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public BigDecimal getRevenueTarget() { return revenueTarget; }
    public void setRevenueTarget(BigDecimal revenueTarget) { this.revenueTarget = revenueTarget; }
    public BigDecimal getRevenueAchieved() { return revenueAchieved; }
    public void setRevenueAchieved(BigDecimal revenueAchieved) { this.revenueAchieved = revenueAchieved; }
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
}
