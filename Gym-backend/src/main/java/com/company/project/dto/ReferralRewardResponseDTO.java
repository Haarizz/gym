package com.company.project.dto;

import com.company.project.entities.ReferralReward;
import com.company.project.enums.RedemptionAction;
import com.company.project.enums.RewardMemberType;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReferralRewardResponseDTO {

    private Long id;
    private String rewardCode;
    private Long referralId;
    private Long rewardRuleId;
    private Long campaignId;
    private String campaignName;
    private String memberId;
    private RewardMemberType memberType;
    private String rewardName;
    private RewardType rewardType;
    private BigDecimal rewardValue;
    private String currency;
    private RewardStatus status;
    private RedemptionAction redemptionAction;
    private Boolean approvalRequired;
    private String approvedBy;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime approvedDate;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime generatedDate;
    private LocalDate expiryDate;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime claimedDate;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime redeemedDate;
    private String remarks;
    // Coupon code, populated only for COUPON-type rewards that already have one generated.
    private String couponCode;

    public static ReferralRewardResponseDTO fromEntity(ReferralReward r) {
        ReferralRewardResponseDTO dto = new ReferralRewardResponseDTO();
        dto.id = r.getId();
        dto.rewardCode = r.getRewardCode();
        dto.referralId = r.getReferralId();
        dto.rewardRuleId = r.getRewardRuleId();
        dto.campaignId = r.getCampaignId();
        dto.campaignName = r.getCampaignName();
        dto.memberId = r.getMemberId();
        dto.memberType = r.getMemberType();
        dto.rewardName = r.getRewardName();
        dto.rewardType = r.getRewardType();
        dto.rewardValue = r.getRewardValue();
        dto.currency = r.getCurrency();
        dto.status = r.getStatus();
        dto.redemptionAction = r.getRedemptionAction();
        dto.approvalRequired = r.getApprovalRequired();
        dto.approvedBy = r.getApprovedBy();
        dto.approvedDate = r.getApprovedDate();
        dto.generatedDate = r.getGeneratedDate();
        dto.expiryDate = r.getExpiryDate();
        dto.claimedDate = r.getClaimedDate();
        dto.redeemedDate = r.getRedeemedDate();
        dto.remarks = r.getRemarks();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRewardCode() { return rewardCode; }
    public void setRewardCode(String rewardCode) { this.rewardCode = rewardCode; }

    public Long getReferralId() { return referralId; }
    public void setReferralId(Long referralId) { this.referralId = referralId; }

    public Long getRewardRuleId() { return rewardRuleId; }
    public void setRewardRuleId(Long rewardRuleId) { this.rewardRuleId = rewardRuleId; }

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public String getCampaignName() { return campaignName; }
    public void setCampaignName(String campaignName) { this.campaignName = campaignName; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public RewardMemberType getMemberType() { return memberType; }
    public void setMemberType(RewardMemberType memberType) { this.memberType = memberType; }

    public String getRewardName() { return rewardName; }
    public void setRewardName(String rewardName) { this.rewardName = rewardName; }

    public RewardType getRewardType() { return rewardType; }
    public void setRewardType(RewardType rewardType) { this.rewardType = rewardType; }

    public BigDecimal getRewardValue() { return rewardValue; }
    public void setRewardValue(BigDecimal rewardValue) { this.rewardValue = rewardValue; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public RewardStatus getStatus() { return status; }
    public void setStatus(RewardStatus status) { this.status = status; }

    public RedemptionAction getRedemptionAction() { return redemptionAction; }
    public void setRedemptionAction(RedemptionAction redemptionAction) { this.redemptionAction = redemptionAction; }

    public Boolean getApprovalRequired() { return approvalRequired; }
    public void setApprovalRequired(Boolean approvalRequired) { this.approvalRequired = approvalRequired; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getApprovedDate() { return approvedDate; }
    public void setApprovedDate(LocalDateTime approvedDate) { this.approvedDate = approvedDate; }

    public LocalDateTime getGeneratedDate() { return generatedDate; }
    public void setGeneratedDate(LocalDateTime generatedDate) { this.generatedDate = generatedDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public LocalDateTime getClaimedDate() { return claimedDate; }
    public void setClaimedDate(LocalDateTime claimedDate) { this.claimedDate = claimedDate; }

    public LocalDateTime getRedeemedDate() { return redeemedDate; }
    public void setRedeemedDate(LocalDateTime redeemedDate) { this.redeemedDate = redeemedDate; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
}
