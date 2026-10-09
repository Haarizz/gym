package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for renewing or upgrading a member's membership.
 */
public class RenewalRequestDTO {
    // A discount already netted out of membershipFee before it was sent — the plan's
    // running offer or a staff discount — recorded on the receipt only, with offerLabel
    // as its wording ("Offer: Diwali", "Staff discount"). Separate from any code/pass.
    private BigDecimal offerDiscount;
    private String offerLabel;


    private String planName;
    private String membershipEndDate;   // ISO string "YYYY-MM-DDTHH:mm:ssZ"
    private BigDecimal membershipFee;
    private String paymentStatus;       // paid / pending — fallback when amountReceived is omitted
    private String membershipType;      // Individual / Family / Corporate
    private String membershipStatus;    // active / etc.

    // How much is actually being collected now — may be a genuine partial amount
    // (a "Credit" renewal with something received via a real method), not just a
    // binary paid/pending flag. Null falls back to paymentStatus's old binary
    // behavior (paid = full fee, anything else = nothing received).
    private BigDecimal amountReceived;
    // The real method the received portion moved through (Cash/Card/Bank
    // Transfer/Cheque/Online Payment/Mixed) — "Credit" is never sent here since
    // it isn't a real payment instrument, only the absence of one.
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;
    // Which staff member actually handled this renewal — see MemberRequestDTO.processedByStaffId.
    private Long processedByStaffId;
    // A Reward Pass (MEMBERSHIP_DISCOUNT reward id) or a shareable coupon code to apply —
    // at most one. When either is set, membershipFee is the fee BEFORE the discount;
    // the server subtracts it and spends the pass/coupon in the same transaction.
    private Long rewardPassId;
    private String couponCode;
    // A head moving onto a Family/Couple plan (MemberService.convertToFamilyHead):
    // the billed-to-head members' fees added on top of membershipFee, itemized on
    // the renewal receipt like createMember's minorCharges.
    private BigDecimal billedToHeadFeeTotal;
    private List<MinorChargeDTO> minorCharges;

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

    public BigDecimal getAmountReceived() { return amountReceived; }
    public void setAmountReceived(BigDecimal amountReceived) { this.amountReceived = amountReceived; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public BigDecimal getBilledToHeadFeeTotal() { return billedToHeadFeeTotal; }
    public void setBilledToHeadFeeTotal(BigDecimal billedToHeadFeeTotal) { this.billedToHeadFeeTotal = billedToHeadFeeTotal; }

    public List<MinorChargeDTO> getMinorCharges() { return minorCharges; }
    public void setMinorCharges(List<MinorChargeDTO> minorCharges) { this.minorCharges = minorCharges; }

    public BigDecimal getOfferDiscount() { return offerDiscount; }
    public void setOfferDiscount(BigDecimal offerDiscount) { this.offerDiscount = offerDiscount; }

    public String getOfferLabel() { return offerLabel; }
    public void setOfferLabel(String offerLabel) { this.offerLabel = offerLabel; }
}
