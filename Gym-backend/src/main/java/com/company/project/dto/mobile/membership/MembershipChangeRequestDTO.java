package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;
import java.util.List;

public class MembershipChangeRequestDTO {
    private Long rewardPassId;
    private String couponCode;
    /** A promotion picked by id instead of a typed code (one without a code, e.g. the app's offer banner) */
    private Long promotionId;
    private Long planId;
    private String paymentMethodUsed;
    private List<PaymentSplitDTO> paymentBreakdown;

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }
}
