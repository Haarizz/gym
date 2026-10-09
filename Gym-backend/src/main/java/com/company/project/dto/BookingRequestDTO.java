package com.company.project.dto;

public class BookingRequestDTO {

    private Long sessionId;
    private Long memberId;
    private String guestName;
    private String guestEmail;
    private String guestPhone;
    private String status;

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    private String paymentStatus;
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    // A Free PT / Class Reward Pass (ReferralReward id) that pays for this booking.
    private Long rewardPassId;

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }

    // ── Payment for a priced session (mobile member self-booking) ──

    // A promotion or shareable referral coupon code; the server prices and spends it.
    private String couponCode;
    // Part of the price paid from the member's wallet.
    private java.math.BigDecimal walletAmount;
    // The total the app showed the member (after code/pass, before wallet); a mismatch is refused.
    private java.math.BigDecimal expectedAmount;
    // From the PaymentBottomSheet: "Cash", "Card", "Credit", "Mixed Payment", ...
    private String paymentMethodUsed;
    private java.util.List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;
    // ISO date the unpaid part of a Credit/partial payment is due.
    private String paymentDueDate;

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }

    public java.math.BigDecimal getWalletAmount() { return walletAmount; }
    public void setWalletAmount(java.math.BigDecimal walletAmount) { this.walletAmount = walletAmount; }

    public java.math.BigDecimal getExpectedAmount() { return expectedAmount; }
    public void setExpectedAmount(java.math.BigDecimal expectedAmount) { this.expectedAmount = expectedAmount; }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public java.util.List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(java.util.List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getPaymentDueDate() { return paymentDueDate; }
    public void setPaymentDueDate(String paymentDueDate) { this.paymentDueDate = paymentDueDate; }
}
