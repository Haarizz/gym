package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class RewardStatsDTO {

    private long totalGenerated;
    private long available;
    private long pendingApproval;
    private long redeemed;
    private long expired;
    private long cancelled;
    private BigDecimal walletCreditsIssued;
    private long couponsUsed;
    private String topRewardType;
    private String mostActiveReferrer;
    private BigDecimal highestRewardEarned;
    private List<MonthlyCount> monthlyRewards;
    private Map<String, Long> rewardTypeDistribution;

    public long getTotalGenerated() { return totalGenerated; }
    public void setTotalGenerated(long totalGenerated) { this.totalGenerated = totalGenerated; }

    public long getAvailable() { return available; }
    public void setAvailable(long available) { this.available = available; }

    public long getPendingApproval() { return pendingApproval; }
    public void setPendingApproval(long pendingApproval) { this.pendingApproval = pendingApproval; }

    public long getRedeemed() { return redeemed; }
    public void setRedeemed(long redeemed) { this.redeemed = redeemed; }

    public long getExpired() { return expired; }
    public void setExpired(long expired) { this.expired = expired; }

    public long getCancelled() { return cancelled; }
    public void setCancelled(long cancelled) { this.cancelled = cancelled; }

    public BigDecimal getWalletCreditsIssued() { return walletCreditsIssued; }
    public void setWalletCreditsIssued(BigDecimal walletCreditsIssued) { this.walletCreditsIssued = walletCreditsIssued; }

    public long getCouponsUsed() { return couponsUsed; }
    public void setCouponsUsed(long couponsUsed) { this.couponsUsed = couponsUsed; }

    public String getTopRewardType() { return topRewardType; }
    public void setTopRewardType(String topRewardType) { this.topRewardType = topRewardType; }

    public String getMostActiveReferrer() { return mostActiveReferrer; }
    public void setMostActiveReferrer(String mostActiveReferrer) { this.mostActiveReferrer = mostActiveReferrer; }

    public BigDecimal getHighestRewardEarned() { return highestRewardEarned; }
    public void setHighestRewardEarned(BigDecimal highestRewardEarned) { this.highestRewardEarned = highestRewardEarned; }

    public List<MonthlyCount> getMonthlyRewards() { return monthlyRewards; }
    public void setMonthlyRewards(List<MonthlyCount> monthlyRewards) { this.monthlyRewards = monthlyRewards; }

    public Map<String, Long> getRewardTypeDistribution() { return rewardTypeDistribution; }
    public void setRewardTypeDistribution(Map<String, Long> rewardTypeDistribution) { this.rewardTypeDistribution = rewardTypeDistribution; }

    public static class MonthlyCount {
        private String month;
        private long count;

        public MonthlyCount() {}
        public MonthlyCount(String month, long count) { this.month = month; this.count = count; }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
}
