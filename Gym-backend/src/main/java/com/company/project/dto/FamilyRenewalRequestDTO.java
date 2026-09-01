package com.company.project.dto;

import java.util.List;

/**
 * Request body for renewing an entire family together in ONE invoice under
 * family_head billing mode (see MemberService.renewFamily). The fee itself is
 * NOT supplied by the client — it's authoritatively recalculated server-side
 * from the plan's pricePerMember × the family's current headcount.
 */
public class FamilyRenewalRequestDTO {

    private String planName;
    private String paymentStatus; // paid / pending
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;
    // Which staff member actually handled this renewal — see MemberRequestDTO.processedByStaffId.
    private Long processedByStaffId;

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

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
}
