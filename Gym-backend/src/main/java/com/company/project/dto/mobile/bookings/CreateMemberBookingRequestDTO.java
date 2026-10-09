package com.company.project.dto.mobile.bookings;

import com.fasterxml.jackson.annotation.JsonAlias;

public class CreateMemberBookingRequestDTO {
    
    @JsonAlias({"classId", "class_id"})
    private Long classId;

    // Optional Free PT / Class Reward Pass to pay for the booking.
    @JsonAlias({"rewardPassId", "reward_pass_id"})
    private Long rewardPassId;

    public CreateMemberBookingRequestDTO() {}

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }

    // ── Payment for a priced session (see BookingPaymentService.charge) ──

    // A promotion or shareable referral coupon code — instead of a Reward Pass.
    private String couponCode;
    // Part of the price to pay from the member's wallet.
    private java.math.BigDecimal walletAmount;
    // The total the app showed (after code/pass, before wallet); refused if the server's differs.
    private java.math.BigDecimal expectedAmount;
    private String paymentMethodUsed;
    private java.util.List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;
    private String paymentDueDate;

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public java.math.BigDecimal getWalletAmount() { return walletAmount; }
    public void setWalletAmount(java.math.BigDecimal walletAmount) { this.walletAmount = walletAmount; }

    public java.math.BigDecimal getExpectedAmount() { return expectedAmount; }
    public void setExpectedAmount(java.math.BigDecimal expectedAmount) { this.expectedAmount = expectedAmount; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public java.util.List<com.company.project.dto.PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(java.util.List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getPaymentDueDate() { return paymentDueDate; }
    public void setPaymentDueDate(String paymentDueDate) { this.paymentDueDate = paymentDueDate; }
}
