package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;

import java.math.BigDecimal;
import java.util.List;

public class MobileAddOnPurchaseRequestDTO {

    private String paymentMethodUsed;
    private List<PaymentSplitDTO> paymentBreakdown;
    private BigDecimal paidAmount;
    private String bankAccountCode;
    private String bankAccountName;
    // Credit's due date for the unpaid remainder (ISO date)
    private String paymentDueDate;
    // A promotion code scoped to add-ons; referral coupons don't apply to add-ons
    private String couponCode;
    // How much of the price comes out of the member's wallet
    private BigDecimal walletAmount;
    // The total the app showed after the code; the purchase is refused if the server's differs
    private BigDecimal expectedAmount;

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

    public String getBankAccountCode() {
        return bankAccountCode;
    }

    public void setBankAccountCode(String bankAccountCode) {
        this.bankAccountCode = bankAccountCode;
    }

    public String getBankAccountName() {
        return bankAccountName;
    }

    public void setBankAccountName(String bankAccountName) {
        this.bankAccountName = bankAccountName;
    }

    public String getPaymentDueDate() {
        return paymentDueDate;
    }

    public void setPaymentDueDate(String paymentDueDate) {
        this.paymentDueDate = paymentDueDate;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public BigDecimal getWalletAmount() {
        return walletAmount;
    }

    public void setWalletAmount(BigDecimal walletAmount) {
        this.walletAmount = walletAmount;
    }

    public BigDecimal getExpectedAmount() {
        return expectedAmount;
    }

    public void setExpectedAmount(BigDecimal expectedAmount) {
        this.expectedAmount = expectedAmount;
    }
}
