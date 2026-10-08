package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * One stretch of a POS session on a terminal; a transfer ends one row and starts the next.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_session_terminal_history")
public class PosSessionTerminalHistory extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "terminal_id")
    private Long terminalId;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "started_at", nullable = false)
    private java.time.LocalDateTime startedAt;

    @Column(name = "ended_at")
    private java.time.LocalDateTime endedAt;

    @Column(name = "moved_by", length = 100)
    private String movedBy;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "reason", length = 500)
    private String reason;

    public PosSessionTerminalHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getTerminalId() { return terminalId; }
    public void setTerminalId(Long terminalId) { this.terminalId = terminalId; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public java.time.LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(java.time.LocalDateTime startedAt) { this.startedAt = startedAt; }

    public java.time.LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(java.time.LocalDateTime endedAt) { this.endedAt = endedAt; }

    public String getMovedBy() { return movedBy; }
    public void setMovedBy(String movedBy) { this.movedBy = movedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
