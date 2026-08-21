package com.company.project.dto.mobile.performance;

import java.math.BigDecimal;
import java.util.List;

public class TrainerPerformanceResponseDTO {

    private MonthlyPerformanceDTO monthlyPerformance;
    private ActiveClientsDTO activeClients;
    private List<TrainerSessionTrendDTO> sixMonthTrend;
    private PerformanceTipDTO performanceTip;

    public TrainerPerformanceResponseDTO() {}

    public TrainerPerformanceResponseDTO(
            MonthlyPerformanceDTO monthlyPerformance,
            ActiveClientsDTO activeClients,
            List<TrainerSessionTrendDTO> sixMonthTrend,
            PerformanceTipDTO performanceTip) {
        this.monthlyPerformance = monthlyPerformance;
        this.activeClients = activeClients;
        this.sixMonthTrend = sixMonthTrend;
        this.performanceTip = performanceTip;
    }

    public MonthlyPerformanceDTO getMonthlyPerformance() {
        return monthlyPerformance;
    }

    public void setMonthlyPerformance(MonthlyPerformanceDTO monthlyPerformance) {
        this.monthlyPerformance = monthlyPerformance;
    }

    public ActiveClientsDTO getActiveClients() {
        return activeClients;
    }

    public void setActiveClients(ActiveClientsDTO activeClients) {
        this.activeClients = activeClients;
    }

    public List<TrainerSessionTrendDTO> getSixMonthTrend() {
        return sixMonthTrend;
    }

    public void setSixMonthTrend(List<TrainerSessionTrendDTO> sixMonthTrend) {
        this.sixMonthTrend = sixMonthTrend;
    }

    public PerformanceTipDTO getPerformanceTip() {
        return performanceTip;
    }

    public void setPerformanceTip(PerformanceTipDTO performanceTip) {
        this.performanceTip = performanceTip;
    }

    // ── Nested DTOs ─────────────────────────────────────────────────────────────

    public static class MonthlyPerformanceDTO {
        private RevenuePerformanceDTO revenue;
        private SessionPerformanceDTO sessions;

        public MonthlyPerformanceDTO() {}

        public MonthlyPerformanceDTO(RevenuePerformanceDTO revenue, SessionPerformanceDTO sessions) {
            this.revenue = revenue;
            this.sessions = sessions;
        }

        public RevenuePerformanceDTO getRevenue() { return revenue; }
        public void setRevenue(RevenuePerformanceDTO revenue) { this.revenue = revenue; }
        public SessionPerformanceDTO getSessions() { return sessions; }
        public void setSessions(SessionPerformanceDTO sessions) { this.sessions = sessions; }
    }

    public static class RevenuePerformanceDTO {
        private BigDecimal achieved;
        private BigDecimal target;
        private int percentage;

        public RevenuePerformanceDTO() {}

        public RevenuePerformanceDTO(BigDecimal achieved, BigDecimal target, int percentage) {
            this.achieved = achieved != null ? achieved : BigDecimal.ZERO;
            this.target = target != null ? target : BigDecimal.ZERO;
            this.percentage = percentage;
        }

        public BigDecimal getAchieved() { return achieved; }
        public void setAchieved(BigDecimal achieved) { this.achieved = achieved; }
        public BigDecimal getTarget() { return target; }
        public void setTarget(BigDecimal target) { this.target = target; }
        public int getPercentage() { return percentage; }
        public void setPercentage(int percentage) { this.percentage = percentage; }
    }

    public static class SessionPerformanceDTO {
        private int completed;
        private int target;
        private double percentage;

        public SessionPerformanceDTO() {}

        public SessionPerformanceDTO(int completed, int target, double percentage) {
            this.completed = completed;
            this.target = target;
            this.percentage = percentage;
        }

        public int getCompleted() { return completed; }
        public void setCompleted(int completed) { this.completed = completed; }
        public int getTarget() { return target; }
        public void setTarget(int target) { this.target = target; }
        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
    }

    public static class ActiveClientsDTO {
        private int count;
        private int monthlyChange;

        public ActiveClientsDTO() {}

        public ActiveClientsDTO(int count, int monthlyChange) {
            this.count = count;
            this.monthlyChange = monthlyChange;
        }

        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
        public int getMonthlyChange() { return monthlyChange; }
        public void setMonthlyChange(int monthlyChange) { this.monthlyChange = monthlyChange; }
    }

    public static class TrainerSessionTrendDTO {
        private String month;
        private int sessions;

        public TrainerSessionTrendDTO() {}

        public TrainerSessionTrendDTO(String month, int sessions) {
            this.month = month;
            this.sessions = sessions;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }
        public int getSessions() { return sessions; }
        public void setSessions(int sessions) { this.sessions = sessions; }
    }

    public static class PerformanceTipDTO {
        private double remainingPercentage;
        private int sessionsRemaining;

        public PerformanceTipDTO() {}

        public PerformanceTipDTO(double remainingPercentage, int sessionsRemaining) {
            this.remainingPercentage = remainingPercentage;
            this.sessionsRemaining = sessionsRemaining;
        }

        public double getRemainingPercentage() { return remainingPercentage; }
        public void setRemainingPercentage(double remainingPercentage) { this.remainingPercentage = remainingPercentage; }
        public int getSessionsRemaining() { return sessionsRemaining; }
        public void setSessionsRemaining(int sessionsRemaining) { this.sessionsRemaining = sessionsRemaining; }
    }
}
