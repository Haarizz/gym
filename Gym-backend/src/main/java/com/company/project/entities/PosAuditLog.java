package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * POS-specific audit trail (session open/close, cash movements, overrides, returns,
 * reprints, drawer opens, day close, settings changes), separate from FinancialAuditLog.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_audit_logs")
public class PosAuditLog extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "action", length = 50, nullable = false)
    private String action;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "pos_session_id")
    private Long posSessionId;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    public PosAuditLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }

    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }
}
