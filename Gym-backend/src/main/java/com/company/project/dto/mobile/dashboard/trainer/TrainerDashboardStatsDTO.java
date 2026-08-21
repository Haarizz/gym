package com.company.project.dto.mobile.dashboard.trainer;

import java.math.BigDecimal;

public class TrainerDashboardStatsDTO {
    private int sessionsScheduled;
    private int sessionsCompleted;
    private int activeMembers;
    private BigDecimal todayEarnings;
    private int monthlyTargetPercentage;

    public TrainerDashboardStatsDTO() {}

    public TrainerDashboardStatsDTO(int sessionsScheduled, int sessionsCompleted, int activeMembers, BigDecimal todayEarnings, int monthlyTargetPercentage) {
        this.sessionsScheduled = sessionsScheduled;
        this.sessionsCompleted = sessionsCompleted;
        this.activeMembers = activeMembers;
        this.todayEarnings = todayEarnings;
        this.monthlyTargetPercentage = monthlyTargetPercentage;
    }

    public int getSessionsScheduled() {
        return sessionsScheduled;
    }

    public void setSessionsScheduled(int sessionsScheduled) {
        this.sessionsScheduled = sessionsScheduled;
    }

    public int getSessionsCompleted() {
        return sessionsCompleted;
    }

    public void setSessionsCompleted(int sessionsCompleted) {
        this.sessionsCompleted = sessionsCompleted;
    }

    public int getActiveMembers() {
        return activeMembers;
    }

    public void setActiveMembers(int activeMembers) {
        this.activeMembers = activeMembers;
    }

    public BigDecimal getTodayEarnings() {
        return todayEarnings;
    }

    public void setTodayEarnings(BigDecimal todayEarnings) {
        this.todayEarnings = todayEarnings;
    }

    public int getMonthlyTargetPercentage() {
        return monthlyTargetPercentage;
    }

    public void setMonthlyTargetPercentage(int monthlyTargetPercentage) {
        this.monthlyTargetPercentage = monthlyTargetPercentage;
    }
}
