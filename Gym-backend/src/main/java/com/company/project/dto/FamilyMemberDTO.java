package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Represents a family member entry in the Add Member form / the post-creation
 * "add family member" endpoint. Used when membership_type = "Family" to create
 * linked member records.
 *
 * Adults get a completely independent membership (own plan/fee/receipt/ledger
 * post) — the adult-only fields below apply to them.
 * Minors are billed to the family head instead — the minor-only fields below
 * (just a fee to add to the guardian's invoice) apply to them.
 */
public class FamilyMemberDTO {

    private String name;
    private String relationship;
    private Boolean isMinor;
    private String dateOfBirth; // "YYYY-MM-DD", optional, informational

    // ── Adult-only: independent membership fields ───────────────────────────
    private String email;
    private String phone;
    private String membershipPlan;
    private BigDecimal membershipFee;
    private String paymentStatus;          // paid / pending
    private BigDecimal outstandingBalance; // explicit partial/credit balance, optional
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String bankAccountCode;
    private String bankAccountName;

    // ── Minor-only: amount added to the guardian's invoice ──────────────────
    private BigDecimal minorFee;
    // How much of minorFee was actually collected now (0..minorFee, partial
    // allowed) — that portion is folded into the guardian's paidAmount instead of
    // sitting in the guardian's outstanding balance/due.
    private BigDecimal minorPaidAmount;
    private String minorPaymentMethod;
    private List<PaymentSplitDTO> minorPaymentBreakdown;
    private String minorBankAccountCode;
    private String minorBankAccountName;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    public Boolean getIsMinor() { return isMinor; }
    public void setIsMinor(Boolean isMinor) { this.isMinor = isMinor; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMembershipPlan() { return membershipPlan; }
    public void setMembershipPlan(String membershipPlan) { this.membershipPlan = membershipPlan; }

    public BigDecimal getMembershipFee() { return membershipFee; }
    public void setMembershipFee(BigDecimal membershipFee) { this.membershipFee = membershipFee; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public BigDecimal getMinorFee() { return minorFee; }
    public void setMinorFee(BigDecimal minorFee) { this.minorFee = minorFee; }

    public BigDecimal getMinorPaidAmount() { return minorPaidAmount; }
    public void setMinorPaidAmount(BigDecimal minorPaidAmount) { this.minorPaidAmount = minorPaidAmount; }

    public String getMinorPaymentMethod() { return minorPaymentMethod; }
    public void setMinorPaymentMethod(String minorPaymentMethod) { this.minorPaymentMethod = minorPaymentMethod; }

    public List<PaymentSplitDTO> getMinorPaymentBreakdown() { return minorPaymentBreakdown; }
    public void setMinorPaymentBreakdown(List<PaymentSplitDTO> minorPaymentBreakdown) { this.minorPaymentBreakdown = minorPaymentBreakdown; }

    public String getMinorBankAccountCode() { return minorBankAccountCode; }
    public void setMinorBankAccountCode(String minorBankAccountCode) { this.minorBankAccountCode = minorBankAccountCode; }

    public String getMinorBankAccountName() { return minorBankAccountName; }
    public void setMinorBankAccountName(String minorBankAccountName) { this.minorBankAccountName = minorBankAccountName; }
}
