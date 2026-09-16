package com.company.project.dto;

import com.company.project.entities.MobileReferralStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * What the current mobile user sees about the referral code THEY claimed as a
 * referee. Field names are pinned to camelCase via @JsonProperty because the
 * app's global spring.jackson.property-naming-strategy=SNAKE_CASE would
 * otherwise rewrite them (e.g. claimedAt -> claimed_at), which the mobile
 * client's camelCase DTOs don't expect — the same pattern already used by the
 * other dto/mobile/** classes.
 */
public class MyReferralClaimDTO {

    @JsonProperty("referrerName")
    private String referrerName;
    @JsonProperty("status")
    private MobileReferralStatus status;
    @JsonProperty("claimedAt")
    private LocalDateTime claimedAt;
    @JsonProperty("canRetry")
    private boolean canRetry;

    public MyReferralClaimDTO() {}

    public MyReferralClaimDTO(String referrerName, MobileReferralStatus status, LocalDateTime claimedAt, boolean canRetry) {
        this.referrerName = referrerName;
        this.status = status;
        this.claimedAt = claimedAt;
        this.canRetry = canRetry;
    }

    public String getReferrerName() { return referrerName; }
    public void setReferrerName(String referrerName) { this.referrerName = referrerName; }

    public MobileReferralStatus getStatus() { return status; }
    public void setStatus(MobileReferralStatus status) { this.status = status; }

    public LocalDateTime getClaimedAt() { return claimedAt; }
    public void setClaimedAt(LocalDateTime claimedAt) { this.claimedAt = claimedAt; }

    public boolean isCanRetry() { return canRetry; }
    public void setCanRetry(boolean canRetry) { this.canRetry = canRetry; }
}
