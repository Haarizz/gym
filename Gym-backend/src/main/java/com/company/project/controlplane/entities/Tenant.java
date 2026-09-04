package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenants")
public class Tenant extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    // ACTIVE / INACTIVE / SUSPENDED — mirrors Gym.status. Plus, since Phase 3
    // (TenantProvisioningService), PROVISIONING and PROVISION_FAILED — set while a
    // new tenant's dedicated database is being created/migrated/seeded asynchronously,
    // and if that pipeline fails, respectively. Plain unconstrained VARCHAR, same as
    // Gym.status — these are application-level conventions, not a DB CHECK constraint.
    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "owner_user_id")
    private Long ownerUserId;

    public Tenant() {}

    public Tenant(String name, String slug) {
        this.name = name;
        this.slug = slug;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(Long ownerUserId) { this.ownerUserId = ownerUserId; }
}
