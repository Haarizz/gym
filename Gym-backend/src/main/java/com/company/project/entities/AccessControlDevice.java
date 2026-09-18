package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * GymOS's "Access Control Devices" widget: physical entry hardware (face
 * scanners, card readers, turnstiles) per branch, replacing gymos.tsx's
 * hardcoded accessControlDevices sample data. Branch-scoped like Facility.
 * Status is admin-managed — there is no IoT/heartbeat layer that pings this
 * hardware, so "online/offline" reflects what staff record, not a live probe.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "access_control_devices")
public class AccessControlDevice extends BaseEntity implements BranchAware {

    public static final String STATUS_ONLINE = "ONLINE";
    public static final String STATUS_OFFLINE = "OFFLINE";
    public static final String STATUS_MAINTENANCE = "MAINTENANCE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_code", nullable = false, unique = true)
    private String deviceCode;

    @Column(nullable = false)
    private String name;

    @Column(name = "device_type", nullable = false)
    private String deviceType;

    private String location;

    @Column(nullable = false)
    private String status = STATUS_OFFLINE;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDeviceCode() { return deviceCode; }
    public void setDeviceCode(String deviceCode) { this.deviceCode = deviceCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(LocalDateTime lastSyncAt) { this.lastSyncAt = lastSyncAt; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
