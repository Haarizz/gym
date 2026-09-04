package com.company.project.dto;

import java.time.LocalDateTime;

public class GymResponseDTO {
    private Long id;
    private String name;
    private String slug;
    private String address;
    private String phone;
    private String email;
    private String contactPerson;
    private Double lat;
    private Double lng;
    private String status;
    private boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long branchCount;
    private String ownerUsername;

    // Phase 8: distinguishes a primary-DB Gym row ("PRIMARY", id = Gym.id) from a
    // control-plane-only tenant ("TENANT", id = Tenant.id) — the two are separate id
    // spaces that can numerically collide (confirmed live: Test Gym is Gym.id=1 but
    // Tenant.id=2), so the frontend needs this to know which update/status endpoint
    // variant to call for a given row. tenantId is set (mirrors id) for TENANT rows
    // and null for PRIMARY rows, as an explicit, unambiguous alternative to relying
    // on callers to remember what "id" means for a given source.
    private String source;
    private Long tenantId;

    public GymResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public long getBranchCount() { return branchCount; }
    public void setBranchCount(long branchCount) { this.branchCount = branchCount; }

    public String getOwnerUsername() { return ownerUsername; }
    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
}
