package com.company.project.controlplane.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "global_branch_discovery")
public class GlobalBranchDiscovery extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "gym_name", nullable = false)
    private String gymName;

    @Column(name = "branch_name", nullable = false)
    private String branchName;

    @Column(columnDefinition = "TEXT")
    private String address;

    private Double lat;
    private Double lng;
    private String phone;

    @Column(nullable = false)
    private String status = "ACTIVE";

    public GlobalBranchDiscovery() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
