package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class WalkInCheckInRequest {

    private String name;            // required
    private String phone;           // required
    private String email;
    // "gym" | "class" | "personal_training"
    private String sessionType;
    // "paid" | "partial" | "pending"
    private String paymentStatus;
    // The day-pass amount actually charged — when paymentStatus is "paid" and this
    // is positive, it's posted to the ledger as Service/Add-on Revenue.
    private BigDecimal amount;
    // How much of amount was actually received now (the rest is left on credit).
    // Takes precedence over paymentStatus; null = all of it if "paid", else none.
    private BigDecimal paidAmount;
    private String paymentMethod;
    // Bank account a single Online payment landed in — same as a renewal's
    private String bankAccountCode;
    private String bankAccountName;
    // How the payment was actually received — card type, cheque number/bank/date,
    // bank account, or online payment provider — same shape as a member's payment.
    private List<PaymentSplitDTO> paymentBreakdown;
    private String deviceId;
    private String notes;
    // Which staff member actually handled this walk-in — see MemberRequestDTO.processedByStaffId.
    private Long processedByStaffId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
}
