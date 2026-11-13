package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One membership cancellation (Members › Cancel membership). A family head's cancellation
 * covers the whole household in one row. Member details are copied in so the history reads
 * the same after renames or a rejoin.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "member_cancellations")
public class MemberCancellation extends BaseEntity implements BranchAware {

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

    @Column(name = "household_ids", columnDefinition = "TEXT")
    private String householdIds;

    @Column(name = "household_size", nullable = false)
    private int householdSize = 1;

    @Column(name = "with_refund", nullable = false)
    private boolean withRefund;

    @Column(name = "refund_amount", nullable = false)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "policy_amount", nullable = false)
    private BigDecimal policyAmount = BigDecimal.ZERO;

    @Column(name = "policy_method")
    private String policyMethod;

    @Column(name = "refund_voucher_nos", columnDefinition = "TEXT")
    private String refundVoucherNos;

    @Column(name = "dues_action")
    private String duesAction;

    @Column(name = "dues_amount", nullable = false)
    private BigDecimal duesAmount = BigDecimal.ZERO;

    @Column(name = "expiry_dues_cancelled", nullable = false)
    private BigDecimal expiryDuesCancelled = BigDecimal.ZERO;

    @Column(name = "revenue_kept", nullable = false)
    private BigDecimal revenueKept = BigDecimal.ZERO;

    @Column(name = "reason")
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cancelled_by")
    private String cancelledBy;

    @Column(name = "cancelled_at", nullable = false)
    private LocalDateTime cancelledAt;

    public Long getId() { return id; }
    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }
    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }
    public String getMemberCode() { return memberCode; }
    public void setMemberCode(String memberCode) { this.memberCode = memberCode; }
    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }
    public String getHouseholdIds() { return householdIds; }
    public void setHouseholdIds(String householdIds) { this.householdIds = householdIds; }
    public int getHouseholdSize() { return householdSize; }
    public void setHouseholdSize(int householdSize) { this.householdSize = householdSize; }
    public boolean isWithRefund() { return withRefund; }
    public void setWithRefund(boolean withRefund) { this.withRefund = withRefund; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public BigDecimal getPolicyAmount() { return policyAmount; }
    public void setPolicyAmount(BigDecimal policyAmount) { this.policyAmount = policyAmount; }
    public String getPolicyMethod() { return policyMethod; }
    public void setPolicyMethod(String policyMethod) { this.policyMethod = policyMethod; }
    public String getRefundVoucherNos() { return refundVoucherNos; }
    public void setRefundVoucherNos(String refundVoucherNos) { this.refundVoucherNos = refundVoucherNos; }
    public String getDuesAction() { return duesAction; }
    public void setDuesAction(String duesAction) { this.duesAction = duesAction; }
    public BigDecimal getDuesAmount() { return duesAmount; }
    public void setDuesAmount(BigDecimal duesAmount) { this.duesAmount = duesAmount; }
    public BigDecimal getExpiryDuesCancelled() { return expiryDuesCancelled; }
    public void setExpiryDuesCancelled(BigDecimal expiryDuesCancelled) { this.expiryDuesCancelled = expiryDuesCancelled; }
    public BigDecimal getRevenueKept() { return revenueKept; }
    public void setRevenueKept(BigDecimal revenueKept) { this.revenueKept = revenueKept; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String cancelledBy) { this.cancelledBy = cancelledBy; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
}
