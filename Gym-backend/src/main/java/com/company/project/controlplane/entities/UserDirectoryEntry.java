package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Cross-tenant username/email -> tenant slug lookup, used by AuthService.login()
 * to resolve which tenant database to authenticate a user against BEFORE calling
 * authenticationManager.authenticate(...). A user with no row here (GYMBIOS_ADMIN,
 * or any account not yet migrated/provisioned into its own tenant database) is
 * resolved via the default/primary DataSource exactly as before Phase 5.
 */
@Entity
@Table(name = "user_directory")
public class UserDirectoryEntry extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    public UserDirectoryEntry() {}

    public UserDirectoryEntry(String username, String email, String tenantSlug) {
        this.username = username;
        this.email = email;
        this.tenantSlug = tenantSlug;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }
}
