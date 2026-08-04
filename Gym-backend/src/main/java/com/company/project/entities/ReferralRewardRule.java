package com.company.project.entities;

import com.company.project.enums.RedemptionAction;
import com.company.project.enums.RewardType;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "referral_reward_rules")
public class ReferralRewardRule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Legacy free-text classification (discount / credit / points / free_session),
    // kept for backward compatibility with the existing Referrals page Rewards tab.
    @Column(name = "type")
    private String type;

    @Column(name = "value", precision = 10, scale = 2)
    private BigDecimal value;

    // AED, %, sessions, points
    @Column(name = "unit")
    private String unit;

    // referrer / referee / both
    @Column(name = "eligibility")
    private String eligibility;

    // signup / payment / both
    @Column(name = "condition_trigger", columnDefinition = "VARCHAR(50) DEFAULT 'signup'")
    private String conditionTrigger;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "expiry_days")
    private Integer expiryDays;

    // ── Reward Engine extensions ──────────────────────────────────────────────

    // Canonical reward type/redemption dispatch (new rules should set these; legacy
    // `type`/`unit` remain for rules created before this engine existed).
    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type")
    private RewardType rewardType;

    @Enumerated(EnumType.STRING)
    @Column(name = "redemption_action")
    private RedemptionAction redemptionAction;

    @Column(name = "currency")
    private String currency;

    // Higher priority rules are evaluated first. Ties keep insertion order.
    @Column(name = "priority")
    private Integer priority = 0;

    // Whether this rule's reward can be generated alongside a later-evaluated
    // matching rule for the same referral/member side, instead of the default
    // "first match wins" behavior. See RewardEngineService.
    @Column(name = "stackable")
    private Boolean stackable = false;

    @Column(name = "requires_approval")
    private Boolean requiresApproval = false;

    // Optional campaign wrapper — inherits campaign date window/status when set.
    @Column(name = "campaign_id")
    private Long campaignId;

    // Optional campaign date window carried directly on the rule for evergreen
    // (non-campaign) time-boxed promos.
    @Column(name = "campaign_start_date")
    private java.time.LocalDate campaignStartDate;

    @Column(name = "campaign_end_date")
    private java.time.LocalDate campaignEndDate;

    // Rule only applies to referrals whose new member purchased this plan (null = any plan)
    @Column(name = "target_membership_plan_id")
    private Long targetMembershipPlanId;

    @Column(name = "min_purchase_amount", precision = 10, scale = 2)
    private BigDecimal minPurchaseAmount;

    // Referrer must have at least this many successful referrals for the rule to apply
    @Column(name = "min_referral_count")
    private Integer minReferralCount;

    // Max number of times this rule may reward the same member (null = unlimited)
    @Column(name = "max_rewards_per_member")
    private Integer maxRewardsPerMember;

    public ReferralRewardRule() {}

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

    public java.time.LocalDate getCampaignStartDate() { return campaignStartDate; }
    public void setCampaignStartDate(java.time.LocalDate campaignStartDate) { this.campaignStartDate = campaignStartDate; }

    public java.time.LocalDate getCampaignEndDate() { return campaignEndDate; }
    public void setCampaignEndDate(java.time.LocalDate campaignEndDate) { this.campaignEndDate = campaignEndDate; }

    public Long getTargetMembershipPlanId() { return targetMembershipPlanId; }
    public void setTargetMembershipPlanId(Long targetMembershipPlanId) { this.targetMembershipPlanId = targetMembershipPlanId; }

    public BigDecimal getMinPurchaseAmount() { return minPurchaseAmount; }
    public void setMinPurchaseAmount(BigDecimal minPurchaseAmount) { this.minPurchaseAmount = minPurchaseAmount; }

    public Integer getMinReferralCount() { return minReferralCount; }
    public void setMinReferralCount(Integer minReferralCount) { this.minReferralCount = minReferralCount; }

    public Integer getMaxRewardsPerMember() { return maxRewardsPerMember; }
    public void setMaxRewardsPerMember(Integer maxRewardsPerMember) { this.maxRewardsPerMember = maxRewardsPerMember; }
}
