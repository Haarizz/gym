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

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
