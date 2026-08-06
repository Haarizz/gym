package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Append-only "who posted/reversed/deleted this and when" trail for the
 * financial module — general-purpose, unlike RewardAuditLog which is scoped
 * only to referral rewards. Captures action/who/when/voucher/summary, not
 * full before/after field-level diffs (this codebase has no entity-state
 * snapshotting infrastructure to build that on).
 */
@Entity
@Table(name = "financial_audit_logs")
public class FinancialAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CREATE | UPDATE | POST | REVERSE | CANCEL | DELETE | AUTO_POST
    @Column(name = "action", nullable = false)
    private String action;

    /** Simple class name of the entity acted on (JournalVoucher, Expense, ...). */
    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "voucher_no")
    private String voucherNo;

    /** Module that triggered the action (BILLING, PAYROLL, MANUAL, ...). */
    @Column(name = "module")
    private String module;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public FinancialAuditLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
