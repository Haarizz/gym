package com.company.project.dto;

import java.math.BigDecimal;

/**
 * Request body for renewing a minor family member. Unlike RenewalRequestDTO,
 * the resulting charge is billed to the minor's guardian's account instead of
 * creating an independent balance for the minor.
 */
public class MinorRenewalRequestDTO {

    private String planName;
    private BigDecimal fee;
    private String paymentStatus; // paid / pending

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public BigDecimal getFee() { return fee; }
    public void setFee(BigDecimal fee) { this.fee = fee; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
}
