package com.company.project.dto;

import java.math.BigDecimal;

// Optional body for POST /api/referrals/{id}/mark-successful, letting the caller
// (add-member.tsx, at the moment the referee's new membership is created) supply
// what the reward engine needs to validate rule conditions (min purchase amount,
// target plan) — none of this is derivable from the Referral row itself.
public class MarkSuccessfulRequestDTO {

    private BigDecimal purchaseAmount;
    private Long membershipPlanId;
    private String refereeMemberId;

    public BigDecimal getPurchaseAmount() { return purchaseAmount; }
    public void setPurchaseAmount(BigDecimal purchaseAmount) { this.purchaseAmount = purchaseAmount; }

    public Long getMembershipPlanId() { return membershipPlanId; }
    public void setMembershipPlanId(Long membershipPlanId) { this.membershipPlanId = membershipPlanId; }

    public String getRefereeMemberId() { return refereeMemberId; }
    public void setRefereeMemberId(String refereeMemberId) { this.refereeMemberId = refereeMemberId; }
}
