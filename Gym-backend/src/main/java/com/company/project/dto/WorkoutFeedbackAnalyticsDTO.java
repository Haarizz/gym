package com.company.project.dto;

public class WorkoutFeedbackAnalyticsDTO {
    private long todayFeedback;
    private long totalFeedback;
    private double avgSatisfaction;
    private double recommendationRate;
    private double responseRate;
    private long flaggedCount;
    private long followUpCount;
    private long completedSessions;

    public long getTodayFeedback() { return todayFeedback; }
    public void setTodayFeedback(long todayFeedback) { this.todayFeedback = todayFeedback; }

    public long getTotalFeedback() { return totalFeedback; }
    public void setTotalFeedback(long totalFeedback) { this.totalFeedback = totalFeedback; }

    public double getAvgSatisfaction() { return avgSatisfaction; }
    public void setAvgSatisfaction(double avgSatisfaction) { this.avgSatisfaction = avgSatisfaction; }

    public double getRecommendationRate() { return recommendationRate; }
    public void setRecommendationRate(double recommendationRate) { this.recommendationRate = recommendationRate; }

    public double getResponseRate() { return responseRate; }
    public void setResponseRate(double responseRate) { this.responseRate = responseRate; }

    public long getFlaggedCount() { return flaggedCount; }
    public void setFlaggedCount(long flaggedCount) { this.flaggedCount = flaggedCount; }

    public long getFollowUpCount() { return followUpCount; }
    public void setFollowUpCount(long followUpCount) { this.followUpCount = followUpCount; }

    public long getCompletedSessions() { return completedSessions; }
    public void setCompletedSessions(long completedSessions) { this.completedSessions = completedSessions; }
}
