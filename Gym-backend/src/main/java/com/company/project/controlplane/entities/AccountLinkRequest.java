package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * A gym asking to link one of its member records to a GymBios account that already
 * exists. Nothing is linked until the account owner accepts in their own app
 * (docs/global-accounts-for-gym-created-members-plan.md §1) — staff typing someone
 * else's username or email must never attach a membership to a stranger.
 */
@Entity
@Table(name = "account_link_requests")
public class AccountLinkRequest extends ControlPlaneAuditableEntity {

    public static final String PENDING = "PENDING";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String DECLINED = "DECLINED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "global_user_id", nullable = false)
    private Long globalUserId;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "gym_name")
    private String gymName;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "status", nullable = false)
    private String status = PENDING;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public boolean isOpen() {
        return PENDING.equals(status) && LocalDateTime.now().isBefore(expiresAt);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGlobalUserId() { return globalUserId; }
    public void setGlobalUserId(Long globalUserId) { this.globalUserId = globalUserId; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
