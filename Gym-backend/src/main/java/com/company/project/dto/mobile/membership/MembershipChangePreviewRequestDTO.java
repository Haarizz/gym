package com.company.project.dto.mobile.membership;

public class MembershipChangePreviewRequestDTO {
    private Long rewardPassId;
    private String couponCode;
    /** A promotion picked by id instead of a typed code (one without a code, e.g. the app's offer banner) */
    private Long promotionId;
    private Long planId;

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }
}
