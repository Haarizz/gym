package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * A customer paying down credit (on-account) POS sales. allocations is a JSON list of
 * {transaction_id, transaction_number, amount} applied oldest-first.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_credit_payments")
public class PosCreditPayment extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "payment_number", length = 50)
    private String paymentNumber;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "pos_session_id")
    private Long posSessionId;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 30, nullable = false)
    private String paymentMethod;

    @Column(name = "bank_account_code", length = 50)
    private String bankAccountCode;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "reference")
    private String reference;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "allocations", columnDefinition = "TEXT")
    private String allocations;

    @Column(name = "received_by")
    private String receivedBy;

    @Column(name = "business_date")
    private java.time.LocalDate businessDate;

    public PosCreditPayment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getPaymentNumber() { return paymentNumber; }
    public void setPaymentNumber(String paymentNumber) { this.paymentNumber = paymentNumber; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getAllocations() { return allocations; }
    public void setAllocations(String allocations) { this.allocations = allocations; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public java.time.LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }
}
