package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Append-only "who changed which module and when" trail for GymOS's Module
 * Management, mirroring FinancialAuditLog's shape (action/who/when/summary,
 * no field-level before/after diffing).
 */
@Entity
@Table(name = "module_audit_logs")
public class ModuleAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ENABLE | DISABLE | STATUS_CHANGE
    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "module_key", nullable = false)
    private String moduleKey;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ModuleAuditLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getModuleKey() { return moduleKey; }
    public void setModuleKey(String moduleKey) { this.moduleKey = moduleKey; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
