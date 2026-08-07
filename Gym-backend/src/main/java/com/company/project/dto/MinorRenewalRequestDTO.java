package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body for renewing a minor family member. Unlike RenewalRequestDTO,
 * the resulting charge is billed to the minor's guardian's account instead of
 * creating an independent balance for the minor.
 */
public class MinorRenewalRequestDTO {

    private String planName;
    private BigDecimal fee;
    private String paymentStatus; // paid / partial / pending
    // How much of `fee` was actually collected now — the rest folds onto the
    // guardian's outstandingBalance. Falls back to the full fee when omitted
    // and paymentStatus is "paid" (older caller shape), or zero otherwise.
    private BigDecimal paidAmount;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public BigDecimal getFee() { return fee; }
    public void setFee(BigDecimal fee) { this.fee = fee; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
}
