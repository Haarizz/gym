package com.company.project.dto;

import com.company.project.enums.RedemptionAction;
import com.company.project.enums.RewardType;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class RewardRuleResponseDTO {

    private Long id;
    private String name;
    private String type;
    private BigDecimal value;
    private String unit;
    private String eligibility;
    private String conditionTrigger;
    private Boolean isActive;
    private Integer expiryDays;

    private RewardType rewardType;
    private RedemptionAction redemptionAction;
    private String currency;
    private Integer priority;
    private Boolean stackable;
    private Boolean requiresApproval;
    private Long campaignId;
    private String campaignName;
    private LocalDate campaignStartDate;
    private LocalDate campaignEndDate;
    private Long targetMembershipPlanId;
    private BigDecimal minPurchaseAmount;
    private Integer minReferralCount;
    private Integer maxRewardsPerMember;

    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getEligibility() { return eligibility; }
    public void setEligibility(String eligibility) { this.eligibility = eligibility; }

    public String getConditionTrigger() { return conditionTrigger; }
    public void setConditionTrigger(String conditionTrigger) { this.conditionTrigger = conditionTrigger; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Integer getExpiryDays() { return expiryDays; }
    public void setExpiryDays(Integer expiryDays) { this.expiryDays = expiryDays; }

    public RewardType getRewardType() { return rewardType; }
    public void setRewardType(RewardType rewardType) { this.rewardType = rewardType; }

    public RedemptionAction getRedemptionAction() { return redemptionAction; }
    public void setRedemptionAction(RedemptionAction redemptionAction) { this.redemptionAction = redemptionAction; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Boolean getStackable() { return stackable; }
    public void setStackable(Boolean stackable) { this.stackable = stackable; }

    public Boolean getRequiresApproval() { return requiresApproval; }
    public void setRequiresApproval(Boolean requiresApproval) { this.requiresApproval = requiresApproval; }

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public String getCampaignName() { return campaignName; }
    public void setCampaignName(String campaignName) { this.campaignName = campaignName; }

    public LocalDate getCampaignStartDate() { return campaignStartDate; }
    public void setCampaignStartDate(LocalDate campaignStartDate) { this.campaignStartDate = campaignStartDate; }

    public LocalDate getCampaignEndDate() { return campaignEndDate; }
    public void setCampaignEndDate(LocalDate campaignEndDate) { this.campaignEndDate = campaignEndDate; }

    public Long getTargetMembershipPlanId() { return targetMembershipPlanId; }
    public void setTargetMembershipPlanId(Long targetMembershipPlanId) { this.targetMembershipPlanId = targetMembershipPlanId; }

    public BigDecimal getMinPurchaseAmount() { return minPurchaseAmount; }
    public void setMinPurchaseAmount(BigDecimal minPurchaseAmount) { this.minPurchaseAmount = minPurchaseAmount; }

    public Integer getMinReferralCount() { return minReferralCount; }
    public void setMinReferralCount(Integer minReferralCount) { this.minReferralCount = minReferralCount; }

    public Integer getMaxRewardsPerMember() { return maxRewardsPerMember; }
    public void setMaxRewardsPerMember(Integer maxRewardsPerMember) { this.maxRewardsPerMember = maxRewardsPerMember; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
