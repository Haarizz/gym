package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;
import java.util.List;

public class MembershipChangeRequestDTO {
    private Long planId;
    private String paymentMethodUsed;
    private List<PaymentSplitDTO> paymentBreakdown;

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }
}
