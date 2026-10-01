package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Cross-tenant index: a GymBios app account (global user id) -> each tenant whose
 * members table holds a row linked to it. Only the link is stored; membership
 * status lives in the tenant database and is checked there live (see
 * GlobalMembershipService), since expiry and approval change it without any
 * event that could keep a copy here in sync.
 */
@Entity
@Table(name = "user_memberships")
public class UserMembershipEntry extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "global_user_id", nullable = false)
    private Long globalUserId;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    public UserMembershipEntry() {}

    public UserMembershipEntry(Long globalUserId, String tenantSlug, Long memberId) {
        this.globalUserId = globalUserId;
        this.tenantSlug = tenantSlug;
        this.memberId = memberId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGlobalUserId() { return globalUserId; }
    public void setGlobalUserId(Long globalUserId) { this.globalUserId = globalUserId; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }
}
