package com.company.project.dto;

import java.util.List;

/**
 * Response DTO returned when validating a referral code.
 * Includes the referral details plus any applicable reward rules for the referee (new member).
 */
public class ReferralValidationResponseDTO {

    private ReferralResponseDTO referral;
    private List<RewardRuleResponseDTO> applicableRewardRules;

    public ReferralValidationResponseDTO() {}

    public ReferralValidationResponseDTO(ReferralResponseDTO referral, List<RewardRuleResponseDTO> applicableRewardRules) {
        this.referral = referral;
        this.applicableRewardRules = applicableRewardRules;
    }

    public ReferralResponseDTO getReferral() { return referral; }
    public void setReferral(ReferralResponseDTO referral) { this.referral = referral; }

    public List<RewardRuleResponseDTO> getApplicableRewardRules() { return applicableRewardRules; }
    public void setApplicableRewardRules(List<RewardRuleResponseDTO> applicableRewardRules) { this.applicableRewardRules = applicableRewardRules; }
}
