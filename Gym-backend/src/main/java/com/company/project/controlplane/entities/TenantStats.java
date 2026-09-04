package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "tenant_stats")
public class TenantStats extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "branch_count", nullable = false)
    private int branchCount = 0;

    @Column(name = "active_user_count", nullable = false)
    private int activeUserCount = 0;

    @Column(name = "owner_username")
    private String ownerUsername;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public int getBranchCount() { return branchCount; }
    public void setBranchCount(int branchCount) { this.branchCount = branchCount; }

    public int getActiveUserCount() { return activeUserCount; }
    public void setActiveUserCount(int activeUserCount) { this.activeUserCount = activeUserCount; }

    public String getOwnerUsername() { return ownerUsername; }
    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }

    public LocalDateTime getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(LocalDateTime lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
}
