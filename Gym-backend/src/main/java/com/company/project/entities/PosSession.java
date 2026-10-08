package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_sessions")
public class PosSession extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_number", unique = true)
    private String sessionNumber;

    @Column(name = "opening_cash", precision = 10, scale = 2)
    private BigDecimal openingCash;

    @Column(name = "closing_cash", precision = 10, scale = 2)
    private BigDecimal closingCash;

    @Column(name = "opening_denominations", columnDefinition = "TEXT")
    private String openingDenominations;

    @Column(name = "closing_denominations", columnDefinition = "TEXT")
    private String closingDenominations;

    @Column(name = "status")
    private String status = "OPEN";

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "staff_name")
    private String staffName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "opened_by")
    private String openedBy;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    /** Registered terminal (V80) the session runs on; null for sessions from unregistered browsers. */
    @Column(name = "terminal_id")
    private Long terminalId;

    @Column(name = "counter_name", length = 100)
    private String counterName;

    @Column(name = "business_date")
    private java.time.LocalDate businessDate;

    @Column(name = "expected_cash", precision = 12, scale = 2)
    private BigDecimal expectedCash;

    @Column(name = "cash_variance", precision = 12, scale = 2)
    private BigDecimal cashVariance;

    @Column(name = "card_settlement_amount", precision = 12, scale = 2)
    private BigDecimal cardSettlementAmount;

    @Column(name = "card_batch_no", length = 100)
    private String cardBatchNo;

    @Column(name = "card_settlement_verified")
    private Boolean cardSettlementVerified;

    @Column(name = "variance_remarks", columnDefinition = "TEXT")
    private String varianceRemarks;

    @Column(name = "force_closed")
    private Boolean forceClosed = false;

    @Column(name = "force_close_reason", columnDefinition = "TEXT")
    private String forceCloseReason;

    @Column(name = "x_report_print_count")
    private Integer xReportPrintCount = 0;

    @Column(name = "day_close_id")
    private Long dayCloseId;

    /** Closing workflow (V78): once started, the session can only be closed — no more selling. */
    @Column(name = "closing_started_at")
    private LocalDateTime closingStartedAt;

    @Column(name = "closing_started_by", length = 100)
    private String closingStartedBy;

    /** Terminal heartbeat — last time the till was used. */
    @Column(name = "last_activity_at")
    private LocalDateTime lastActivityAt;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "suspended_by", length = 100)
    private String suspendedBy;

    /** Previous owner when a supervisor-approved takeover moved the session to another user. */
    @Column(name = "taken_over_from", length = 100)
    private String takenOverFrom;

    /** Who approved a cash variance above the threshold at close. */
    @Column(name = "variance_approved_by", length = 100)
    private String varianceApprovedBy;

    public PosSession() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionNumber() { return sessionNumber; }
    public void setSessionNumber(String sessionNumber) { this.sessionNumber = sessionNumber; }

    public BigDecimal getOpeningCash() { return openingCash; }
    public void setOpeningCash(BigDecimal openingCash) { this.openingCash = openingCash; }

    public BigDecimal getClosingCash() { return closingCash; }
    public void setClosingCash(BigDecimal closingCash) { this.closingCash = closingCash; }

    public String getOpeningDenominations() { return openingDenominations; }
    public void setOpeningDenominations(String openingDenominations) { this.openingDenominations = openingDenominations; }

    public String getClosingDenominations() { return closingDenominations; }
    public void setClosingDenominations(String closingDenominations) { this.closingDenominations = closingDenominations; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getOpenedAt() { return openedAt; }
    public void setOpenedAt(LocalDateTime openedAt) { this.openedAt = openedAt; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getOpenedBy() { return openedBy; }
    public void setOpenedBy(String openedBy) { this.openedBy = openedBy; }

    public String getClosedBy() { return closedBy; }
    public void setClosedBy(String closedBy) { this.closedBy = closedBy; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }
    public Long getTerminalId() { return terminalId; }
    public void setTerminalId(Long terminalId) { this.terminalId = terminalId; }
    public String getCounterName() { return counterName; }
    public void setCounterName(String counterName) { this.counterName = counterName; }

    public java.time.LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }

    public BigDecimal getExpectedCash() { return expectedCash; }
    public void setExpectedCash(BigDecimal expectedCash) { this.expectedCash = expectedCash; }

    public BigDecimal getCashVariance() { return cashVariance; }
    public void setCashVariance(BigDecimal cashVariance) { this.cashVariance = cashVariance; }

    public BigDecimal getCardSettlementAmount() { return cardSettlementAmount; }
    public void setCardSettlementAmount(BigDecimal cardSettlementAmount) { this.cardSettlementAmount = cardSettlementAmount; }

    public String getCardBatchNo() { return cardBatchNo; }
    public void setCardBatchNo(String cardBatchNo) { this.cardBatchNo = cardBatchNo; }

    public Boolean getCardSettlementVerified() { return cardSettlementVerified; }
    public void setCardSettlementVerified(Boolean cardSettlementVerified) { this.cardSettlementVerified = cardSettlementVerified; }

    public String getVarianceRemarks() { return varianceRemarks; }
    public void setVarianceRemarks(String varianceRemarks) { this.varianceRemarks = varianceRemarks; }

    public Boolean getForceClosed() { return forceClosed; }
    public void setForceClosed(Boolean forceClosed) { this.forceClosed = forceClosed; }

    public String getForceCloseReason() { return forceCloseReason; }
    public void setForceCloseReason(String forceCloseReason) { this.forceCloseReason = forceCloseReason; }

    public Integer getXReportPrintCount() { return xReportPrintCount; }
    public void setXReportPrintCount(Integer xReportPrintCount) { this.xReportPrintCount = xReportPrintCount; }

    public Long getDayCloseId() { return dayCloseId; }
    public void setDayCloseId(Long dayCloseId) { this.dayCloseId = dayCloseId; }
    public LocalDateTime getClosingStartedAt() { return closingStartedAt; }
    public void setClosingStartedAt(LocalDateTime v) { this.closingStartedAt = v; }
    public String getClosingStartedBy() { return closingStartedBy; }
    public void setClosingStartedBy(String v) { this.closingStartedBy = v; }
    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(LocalDateTime v) { this.lastActivityAt = v; }
    public LocalDateTime getSuspendedAt() { return suspendedAt; }
    public void setSuspendedAt(LocalDateTime v) { this.suspendedAt = v; }
    public String getSuspendedBy() { return suspendedBy; }
    public void setSuspendedBy(String v) { this.suspendedBy = v; }
    public String getTakenOverFrom() { return takenOverFrom; }
    public void setTakenOverFrom(String v) { this.takenOverFrom = v; }
    public String getVarianceApprovedBy() { return varianceApprovedBy; }
    public void setVarianceApprovedBy(String v) { this.varianceApprovedBy = v; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
