package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A membership cancellation waiting for an Admin / Manager (GymOS › Member Deactivation
 * Policy › Approval Required). Holds exactly what staff chose, so approving it carries out
 * that cancellation — with or without the refund — and rejecting it leaves the member as is.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "member_cancellation_requests")
public class MemberCancellationRequest extends BaseEntity implements BranchAware {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "member_db_id", nullable = false)
    private Long memberDbId;

    @Column(name = "member_code")
    private String memberCode;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "household_size", nullable = false)
    private int householdSize = 1;

    @Column(name = "with_refund", nullable = false)
    private boolean withRefund;

    @Column(name = "refund_amount", nullable = false)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "policy_amount", nullable = false)
    private BigDecimal policyAmount = BigDecimal.ZERO;

    @Column(name = "refund_method")
    private String refundMethod;

    @Column(name = "bank_account_code")
    private String bankAccountCode;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "refund_reference")
    private String refundReference;

    @Column(name = "refund_reason_code")
    private String refundReasonCode;

    @Column(name = "dues_action")
    private String duesAction;

    @Column(name = "dues_amount", nullable = false)
    private BigDecimal duesAmount = BigDecimal.ZERO;

    @Column(name = "reason")
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "status", nullable = false)
    private String status = STATUS_PENDING;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "decided_by")
    private String decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote;

    @Column(name = "cancellation_id")
    private Long cancellationId;

    public Long getId() { return id; }
    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }
    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }
    public String getMemberCode() { return memberCode; }
    public void setMemberCode(String memberCode) { this.memberCode = memberCode; }
    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }
    public int getHouseholdSize() { return householdSize; }
    public void setHouseholdSize(int householdSize) { this.householdSize = householdSize; }
    public boolean isWithRefund() { return withRefund; }
    public void setWithRefund(boolean withRefund) { this.withRefund = withRefund; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public BigDecimal getPolicyAmount() { return policyAmount; }
    public void setPolicyAmount(BigDecimal policyAmount) { this.policyAmount = policyAmount; }
    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
    public String getBankAccountCode() { return bankAccountCode; }
    public void setBankAccountCode(String bankAccountCode) { this.bankAccountCode = bankAccountCode; }
    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
    public String getRefundReference() { return refundReference; }
    public void setRefundReference(String refundReference) { this.refundReference = refundReference; }
    public String getRefundReasonCode() { return refundReasonCode; }
    public void setRefundReasonCode(String refundReasonCode) { this.refundReasonCode = refundReasonCode; }
    public String getDuesAction() { return duesAction; }
    public void setDuesAction(String duesAction) { this.duesAction = duesAction; }
    public BigDecimal getDuesAmount() { return duesAmount; }
    public void setDuesAmount(BigDecimal duesAmount) { this.duesAmount = duesAmount; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
    public String getDecisionNote() { return decisionNote; }
    public void setDecisionNote(String decisionNote) { this.decisionNote = decisionNote; }
    public Long getCancellationId() { return cancellationId; }
    public void setCancellationId(Long cancellationId) { this.cancellationId = cancellationId; }
}
