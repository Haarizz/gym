package com.company.project.dto;

import java.math.BigDecimal;

/**
 * Request body for renewing or upgrading a member's membership.
 */
public class RenewalRequestDTO {

    private String planName;
    private String membershipEndDate;   // ISO string "YYYY-MM-DDTHH:mm:ssZ"
    private BigDecimal membershipFee;
    private String paymentStatus;       // paid / pending
    private String membershipType;      // Individual / Family / Corporate
    private String membershipStatus;    // active / etc.

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public String getMembershipEndDate() { return membershipEndDate; }
    public void setMembershipEndDate(String membershipEndDate) { this.membershipEndDate = membershipEndDate; }

    public BigDecimal getMembershipFee() { return membershipFee; }
    public void setMembershipFee(BigDecimal membershipFee) { this.membershipFee = membershipFee; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }
}
