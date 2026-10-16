package com.company.project.dto.ratings;

import java.time.LocalDateTime;

/** Whether a branch can send "Request reviews" now, and to how many members. */
public class GymReviewRequestStatusDTO {
    private LocalDateTime lastRequestedAt;
    private Integer lastRecipientCount;
    /** When the 30-day cooldown ends; null if it can be sent now. */
    private LocalDateTime nextAvailableAt;
    private boolean canRequest;
    /** Members it would go to right now. */
    private int eligibleCount;
    private int cooldownDays;

    public LocalDateTime getLastRequestedAt() { return lastRequestedAt; }
    public void setLastRequestedAt(LocalDateTime lastRequestedAt) { this.lastRequestedAt = lastRequestedAt; }

    public Integer getLastRecipientCount() { return lastRecipientCount; }
    public void setLastRecipientCount(Integer lastRecipientCount) { this.lastRecipientCount = lastRecipientCount; }

    public LocalDateTime getNextAvailableAt() { return nextAvailableAt; }
    public void setNextAvailableAt(LocalDateTime nextAvailableAt) { this.nextAvailableAt = nextAvailableAt; }

    public boolean isCanRequest() { return canRequest; }
    public void setCanRequest(boolean canRequest) { this.canRequest = canRequest; }

    public int getEligibleCount() { return eligibleCount; }
    public void setEligibleCount(int eligibleCount) { this.eligibleCount = eligibleCount; }

    public int getCooldownDays() { return cooldownDays; }
    public void setCooldownDays(int cooldownDays) { this.cooldownDays = cooldownDays; }
}
