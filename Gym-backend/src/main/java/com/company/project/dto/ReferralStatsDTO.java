package com.company.project.dto;

import java.math.BigDecimal;

public class ReferralStatsDTO {

    private long totalReferrals;
    private long successfulReferrals;
    private long pendingReferrals;
    private long expiredReferrals;
    private double conversionRate;
    private BigDecimal totalRewards;
    private long activeRules;

    // Getters & Setters

    public long getTotalReferrals() { return totalReferrals; }
    public void setTotalReferrals(long totalReferrals) { this.totalReferrals = totalReferrals; }

    public long getSuccessfulReferrals() { return successfulReferrals; }
    public void setSuccessfulReferrals(long successfulReferrals) { this.successfulReferrals = successfulReferrals; }

    public long getPendingReferrals() { return pendingReferrals; }
    public void setPendingReferrals(long pendingReferrals) { this.pendingReferrals = pendingReferrals; }

    public long getExpiredReferrals() { return expiredReferrals; }
    public void setExpiredReferrals(long expiredReferrals) { this.expiredReferrals = expiredReferrals; }

    public double getConversionRate() { return conversionRate; }
    public void setConversionRate(double conversionRate) { this.conversionRate = conversionRate; }

    public BigDecimal getTotalRewards() { return totalRewards; }
    public void setTotalRewards(BigDecimal totalRewards) { this.totalRewards = totalRewards; }

    public long getActiveRules() { return activeRules; }
    public void setActiveRules(long activeRules) { this.activeRules = activeRules; }
}
