package com.company.project.dto.mobile.performance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class StaffPerformanceResponseDTO {

    private PeriodDTO period;
    private RevenueTargetDTO revenueTarget;
    private ConversionTargetDTO conversionTarget;
    private SummaryDTO summary;
    private List<TrendItemDTO> trend = new ArrayList<>();
    private List<LeaderboardItemDTO> leaderboard = new ArrayList<>();
    private BreakdownDTO breakdown;
    private MotivationDTO motivation;

    public StaffPerformanceResponseDTO() {}

    public StaffPerformanceResponseDTO(
            PeriodDTO period,
            RevenueTargetDTO revenueTarget,
            ConversionTargetDTO conversionTarget,
            SummaryDTO summary,
            List<TrendItemDTO> trend,
            List<LeaderboardItemDTO> leaderboard,
            BreakdownDTO breakdown,
            MotivationDTO motivation) {
        this.period = period;
        this.revenueTarget = revenueTarget;
        this.conversionTarget = conversionTarget;
        this.summary = summary;
        this.trend = trend != null ? trend : new ArrayList<>();
        this.leaderboard = leaderboard != null ? leaderboard : new ArrayList<>();
        this.breakdown = breakdown;
        this.motivation = motivation;
    }

    public PeriodDTO getPeriod() {
        return period;
    }

    public void setPeriod(PeriodDTO period) {
        this.period = period;
    }

    public RevenueTargetDTO getRevenueTarget() {
        return revenueTarget;
    }

    public void setRevenueTarget(RevenueTargetDTO revenueTarget) {
        this.revenueTarget = revenueTarget;
    }

    public ConversionTargetDTO getConversionTarget() {
        return conversionTarget;
    }

    public void setConversionTarget(ConversionTargetDTO conversionTarget) {
        this.conversionTarget = conversionTarget;
    }

    public SummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(SummaryDTO summary) {
        this.summary = summary;
    }

    public List<TrendItemDTO> getTrend() {
        return trend;
    }

    public void setTrend(List<TrendItemDTO> trend) {
        this.trend = trend != null ? trend : new ArrayList<>();
    }

    public List<LeaderboardItemDTO> getLeaderboard() {
        return leaderboard;
    }

    public void setLeaderboard(List<LeaderboardItemDTO> leaderboard) {
        this.leaderboard = leaderboard != null ? leaderboard : new ArrayList<>();
    }

    public BreakdownDTO getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(BreakdownDTO breakdown) {
        this.breakdown = breakdown;
    }

    public MotivationDTO getMotivation() {
        return motivation;
    }

    public void setMotivation(MotivationDTO motivation) {
        this.motivation = motivation;
    }

    // ── Nested DTOs ─────────────────────────────────────────────────────────────

    public static class PeriodDTO {
        private int year;
        private int month;
        private String label;

        public PeriodDTO() {}

        public PeriodDTO(int year, int month, String label) {
            this.year = year;
            this.month = month;
            this.label = label;
        }

        public int getYear() { return year; }
        public void setYear(int year) { this.year = year; }
        public int getMonth() { return month; }
        public void setMonth(int month) { this.month = month; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
    }

    public static class RevenueTargetDTO {
        private BigDecimal achieved;
        private BigDecimal target;
        private int percentage;

        public RevenueTargetDTO() {}

        public RevenueTargetDTO(BigDecimal achieved, BigDecimal target, int percentage) {
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

    public static class ConversionTargetDTO {
        private int achieved;
        private int target;
        private int percentage;

        public ConversionTargetDTO() {}

        public ConversionTargetDTO(int achieved, int target, int percentage) {
            this.achieved = achieved;
            this.target = target;
            this.percentage = percentage;
        }

        public int getAchieved() { return achieved; }
        public void setAchieved(int achieved) { this.achieved = achieved; }
        public int getTarget() { return target; }
        public void setTarget(int target) { this.target = target; }
        public int getPercentage() { return percentage; }
        public void setPercentage(int percentage) { this.percentage = percentage; }
    }

    public static class SummaryDTO {
        private double rating;
        private int growthPercentage;
        private int leadCount;

        public SummaryDTO() {}

        public SummaryDTO(double rating, int growthPercentage, int leadCount) {
            this.rating = rating;
            this.growthPercentage = growthPercentage;
            this.leadCount = leadCount;
        }

        public double getRating() { return rating; }
        public void setRating(double rating) { this.rating = rating; }
        public int getGrowthPercentage() { return growthPercentage; }
        public void setGrowthPercentage(int growthPercentage) { this.growthPercentage = growthPercentage; }
        public int getLeadCount() { return leadCount; }
        public void setLeadCount(int leadCount) { this.leadCount = leadCount; }
    }

    public static class TrendItemDTO {
        private String period;
        private String label;
        private int conversions;
        private BigDecimal revenue;

        public TrendItemDTO() {}

        public TrendItemDTO(String period, String label, int conversions, BigDecimal revenue) {
            this.period = period;
            this.label = label;
            this.conversions = conversions;
            this.revenue = revenue != null ? revenue : BigDecimal.ZERO;
        }

        public String getPeriod() { return period; }
        public void setPeriod(String period) { this.period = period; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public int getConversions() { return conversions; }
        public void setConversions(int conversions) { this.conversions = conversions; }
        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
    }

    public static class LeaderboardItemDTO {
        private int rank;
        private Long staffId;
        private String staffName;
        private int conversionCount;
        private BigDecimal revenue;
        private boolean currentUser;

        public LeaderboardItemDTO() {}

        public LeaderboardItemDTO(int rank, Long staffId, String staffName, int conversionCount, BigDecimal revenue, boolean currentUser) {
            this.rank = rank;
            this.staffId = staffId;
            this.staffName = staffName;
            this.conversionCount = conversionCount;
            this.revenue = revenue != null ? revenue : BigDecimal.ZERO;
            this.currentUser = currentUser;
        }

        public int getRank() { return rank; }
        public void setRank(int rank) { this.rank = rank; }
        public Long getStaffId() { return staffId; }
        public void setStaffId(Long staffId) { this.staffId = staffId; }
        public String getStaffName() { return staffName; }
        public void setStaffName(String staffName) { this.staffName = staffName; }
        public int getConversionCount() { return conversionCount; }
        public void setConversionCount(int conversionCount) { this.conversionCount = conversionCount; }
        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
        public boolean isCurrentUser() { return currentUser; }
        public void setCurrentUser(boolean currentUser) { this.currentUser = currentUser; }
    }

    public static class BreakdownDTO {
        private int conversionRate;
        private int followUpCompletion;
        private int customerSatisfaction;

        public BreakdownDTO() {}

        public BreakdownDTO(int conversionRate, int followUpCompletion, int customerSatisfaction) {
            this.conversionRate = conversionRate;
            this.followUpCompletion = followUpCompletion;
            this.customerSatisfaction = customerSatisfaction;
        }

        public int getConversionRate() { return conversionRate; }
        public void setConversionRate(int conversionRate) { this.conversionRate = conversionRate; }
        public int getFollowUpCompletion() { return followUpCompletion; }
        public void setFollowUpCompletion(int followUpCompletion) { this.followUpCompletion = followUpCompletion; }
        public int getCustomerSatisfaction() { return customerSatisfaction; }
        public void setCustomerSatisfaction(int customerSatisfaction) { this.customerSatisfaction = customerSatisfaction; }
    }

    public static class MotivationDTO {
        private int remainingConversions;
        private String message;
        private String status;

        public MotivationDTO() {}

        public MotivationDTO(int remainingConversions, String message, String status) {
            this.remainingConversions = remainingConversions;
            this.message = message;
            this.status = status;
        }

        public int getRemainingConversions() { return remainingConversions; }
        public void setRemainingConversions(int remainingConversions) { this.remainingConversions = remainingConversions; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
