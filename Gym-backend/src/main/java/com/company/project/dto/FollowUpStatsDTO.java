package com.company.project.dto;

public class FollowUpStatsDTO {

    private long totalFollowUps;
    private long pendingFollowUps;
    private long overdueFollowUps;
    private long completedFollowUps;
    private long cancelledFollowUps;
    private long rescheduledFollowUps;
    private double completionRate;

    // Getters & Setters

    public long getTotalFollowUps() { return totalFollowUps; }
    public void setTotalFollowUps(long totalFollowUps) { this.totalFollowUps = totalFollowUps; }

    public long getPendingFollowUps() { return pendingFollowUps; }
    public void setPendingFollowUps(long pendingFollowUps) { this.pendingFollowUps = pendingFollowUps; }

    public long getOverdueFollowUps() { return overdueFollowUps; }
    public void setOverdueFollowUps(long overdueFollowUps) { this.overdueFollowUps = overdueFollowUps; }

    public long getCompletedFollowUps() { return completedFollowUps; }
    public void setCompletedFollowUps(long completedFollowUps) { this.completedFollowUps = completedFollowUps; }

    public long getCancelledFollowUps() { return cancelledFollowUps; }
    public void setCancelledFollowUps(long cancelledFollowUps) { this.cancelledFollowUps = cancelledFollowUps; }

    public long getRescheduledFollowUps() { return rescheduledFollowUps; }
    public void setRescheduledFollowUps(long rescheduledFollowUps) { this.rescheduledFollowUps = rescheduledFollowUps; }

    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double completionRate) { this.completionRate = completionRate; }
}
