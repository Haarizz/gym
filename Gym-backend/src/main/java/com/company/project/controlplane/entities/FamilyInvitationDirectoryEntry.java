package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Cross-tenant lookup for mobile Family/Couple invitations: recipient email ->
 * tenant slug + tenant-DB invitation id. Lets a freshly logged-in mobile user's
 * pending invitations be found without scanning every tenant database — the
 * app has no tenant to route to yet at that point. The invitation itself (and
 * the dependent member it links to) lives in the tenant database.
 *
 * recipientEmail is always stored lower-cased.
 */
@Entity
@Table(name = "family_invitation_directory")
public class FamilyInvitationDirectoryEntry extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "invitation_id", nullable = false)
    private Long invitationId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "gym_name")
    private String gymName;

    @Column(name = "inviter_name")
    private String inviterName;

    @Column(name = "plan_name")
    private String planName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getInvitationId() { return invitationId; }
    public void setInvitationId(Long invitationId) { this.invitationId = invitationId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public String getInviterName() { return inviterName; }
    public void setInviterName(String inviterName) { this.inviterName = inviterName; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
}
