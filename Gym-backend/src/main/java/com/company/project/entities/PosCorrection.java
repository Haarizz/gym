package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A maker-checker correction of a posted POS record (BillBull's POS Administration corrections):
 * REQUESTED → PENDING_APPROVAL → APPROVED → APPLIED, with REJECTED / CANCELLED / FAILED as
 * terminal branches. The original and corrected values are kept as JSON snapshots.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_corrections")
public class PosCorrection extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "request_number", length = 40)
    private String requestNumber;

    /** SALE, CASH_MOVEMENT or SESSION. */
    @Column(name = "target_type", length = 30, nullable = false)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "target_label", length = 120)
    private String targetLabel;

    /** PAYMENT_MODE, CUSTOMER, CATEGORY or DENOMINATION. */
    @Column(name = "correction_type", length = 30, nullable = false)
    private String correctionType;

    @Column(name = "original_json", columnDefinition = "TEXT", nullable = false)
    private String originalJson;

    @Column(name = "corrected_json", columnDefinition = "TEXT", nullable = false)
    private String correctedJson;

    /** Money effect where there is one (e.g. corrected minus original counted cash). */
    @Column(name = "difference_amount", precision = 12, scale = 2)
    private BigDecimal differenceAmount;

    @Column(name = "summary", length = 500)
    private String summary;

    @Column(name = "reason", length = 1000, nullable = false)
    private String reason;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "REQUESTED";

    @Column(name = "requested_by", length = 100) private String requestedBy;
    @Column(name = "requested_at") private LocalDateTime requestedAt;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "approved_at") private LocalDateTime approvedAt;
    @Column(name = "approval_notes", length = 1000) private String approvalNotes;
    @Column(name = "rejected_by", length = 100) private String rejectedBy;
    @Column(name = "rejected_at") private LocalDateTime rejectedAt;
    @Column(name = "rejection_reason", length = 1000) private String rejectionReason;
    @Column(name = "applied_by", length = 100) private String appliedBy;
    @Column(name = "applied_at") private LocalDateTime appliedAt;
    @Column(name = "journal_reference", length = 60) private String journalReference;
    @Column(name = "execution_error", length = 1000) private String executionError;
    @Column(name = "cancelled_by", length = 100) private String cancelledBy;
    @Column(name = "cancelled_at") private LocalDateTime cancelledAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }
    public String getRequestNumber() { return requestNumber; }
    public void setRequestNumber(String v) { this.requestNumber = v; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String v) { this.targetType = v; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long v) { this.targetId = v; }
    public String getTargetLabel() { return targetLabel; }
    public void setTargetLabel(String v) { this.targetLabel = v; }
    public String getCorrectionType() { return correctionType; }
    public void setCorrectionType(String v) { this.correctionType = v; }
    public String getOriginalJson() { return originalJson; }
    public void setOriginalJson(String v) { this.originalJson = v; }
    public String getCorrectedJson() { return correctedJson; }
    public void setCorrectedJson(String v) { this.correctedJson = v; }
    public BigDecimal getDifferenceAmount() { return differenceAmount; }
    public void setDifferenceAmount(BigDecimal v) { this.differenceAmount = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String v) { this.requestedBy = v; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime v) { this.requestedAt = v; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime v) { this.submittedAt = v; }
    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String v) { this.approvedBy = v; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime v) { this.approvedAt = v; }
    public String getApprovalNotes() { return approvalNotes; }
    public void setApprovalNotes(String v) { this.approvalNotes = v; }
    public String getRejectedBy() { return rejectedBy; }
    public void setRejectedBy(String v) { this.rejectedBy = v; }
    public LocalDateTime getRejectedAt() { return rejectedAt; }
    public void setRejectedAt(LocalDateTime v) { this.rejectedAt = v; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String v) { this.rejectionReason = v; }
    public String getAppliedBy() { return appliedBy; }
    public void setAppliedBy(String v) { this.appliedBy = v; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime v) { this.appliedAt = v; }
    public String getJournalReference() { return journalReference; }
    public void setJournalReference(String v) { this.journalReference = v; }
    public String getExecutionError() { return executionError; }
    public void setExecutionError(String v) { this.executionError = v; }
    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String v) { this.cancelledBy = v; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime v) { this.cancelledAt = v; }
}
