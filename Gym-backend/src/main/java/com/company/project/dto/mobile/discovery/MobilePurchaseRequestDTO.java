package com.company.project.dto.mobile.discovery;

import com.company.project.dto.PaymentSplitDTO;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

public class MobilePurchaseRequestDTO {
    @JsonProperty("planId")
    private Long planId;

    // "Cash" | "Card" | "Credit" | "Cheque" | "Bank Transfer" | "Online Payment" | "Mixed"
    @JsonProperty("paymentMethodUsed")
    private String paymentMethodUsed;

    @JsonProperty("paymentBreakdown")
    private List<PaymentSplitDTO> paymentBreakdown;

    @JsonProperty("paidAmount")
    private BigDecimal paidAmount;

    @JsonProperty("outstandingBalance")
    private BigDecimal outstandingBalance;

    // ISO date string "YYYY-MM-DD"
    @JsonProperty("paymentDueDate")
    private String paymentDueDate;

    @JsonProperty("bankAccountCode")
    private String bankAccountCode;

    @JsonProperty("bankAccountName")
    private String bankAccountName;

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }

    public String getPaymentMethodUsed() { return paymentMethodUsed; }
    public void setPaymentMethodUsed(String paymentMethodUsed) { this.paymentMethodUsed = paymentMethodUsed; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public String getPaymentDueDate() { return paymentDueDate; }
    public void setPaymentDueDate(String paymentDueDate) { this.paymentDueDate = paymentDueDate; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    @jakarta.validation.Valid
    @JsonProperty("connectedMembers")
    private List<com.company.project.dto.mobile.family.MobileFamilyConnectedMemberDTO> connectedMembers;

    public List<com.company.project.dto.mobile.family.MobileFamilyConnectedMemberDTO> getConnectedMembers() { return connectedMembers; }
    public void setConnectedMembers(List<com.company.project.dto.mobile.family.MobileFamilyConnectedMemberDTO> connectedMembers) { this.connectedMembers = connectedMembers; }

    // A shareable COUPON reward code; the server takes its discount off the plan price.
    @JsonProperty("couponCode")
    private String couponCode;

    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
}
