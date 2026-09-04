package com.company.project.dto;

/**
 * Response body for POST /api/gyms and POST /api/gyms/{tenantId}/retry-provisioning.
 * tenantId is the control-plane Tenant id, NOT a primary-DB Gym.id — no Gym row
 * exists in the primary DB for a Phase-3-provisioned tenant; the new gym's own gyms
 * row lives inside its own new tenant database instead.
 */
public class TenantProvisioningResponseDTO {
    private Long tenantId;
    private String name;
    private String slug;
    private String status;

    public TenantProvisioningResponseDTO() {}

    public TenantProvisioningResponseDTO(Long tenantId, String name, String slug, String status) {
        this.tenantId = tenantId;
        this.name = name;
        this.slug = slug;
        this.status = status;
    }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
