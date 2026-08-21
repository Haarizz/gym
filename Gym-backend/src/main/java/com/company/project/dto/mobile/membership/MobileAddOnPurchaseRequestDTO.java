package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;

import java.math.BigDecimal;
import java.util.List;

public class MobileAddOnPurchaseRequestDTO {

    private String paymentMethodUsed;
    private List<PaymentSplitDTO> paymentBreakdown;
    private BigDecimal paidAmount;

    public MobileAddOnPurchaseRequestDTO() {}

    public String getPaymentMethodUsed() {
        return paymentMethodUsed;
    }

    public void setPaymentMethodUsed(String paymentMethodUsed) {
        this.paymentMethodUsed = paymentMethodUsed;
    }

    public List<PaymentSplitDTO> getPaymentBreakdown() {
        return paymentBreakdown;
    }

    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) {
        this.paymentBreakdown = paymentBreakdown;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }
}
