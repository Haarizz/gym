package com.company.project.dto;

import com.company.project.entities.AccessControlDevice;

import java.time.LocalDateTime;

public class AccessControlDeviceResponseDTO {

    private Long id;
    private String deviceCode;
    private String name;
    private String deviceType;
    private String location;
    private String status;
    private LocalDateTime lastSyncAt;
    private Long branchId;

    public static AccessControlDeviceResponseDTO fromEntity(AccessControlDevice device) {
        AccessControlDeviceResponseDTO dto = new AccessControlDeviceResponseDTO();
        dto.id = device.getId();
        dto.deviceCode = device.getDeviceCode();
        dto.name = device.getName();
        dto.deviceType = device.getDeviceType();
        dto.location = device.getLocation();
        dto.status = device.getStatus();
        dto.lastSyncAt = device.getLastSyncAt();
        dto.branchId = device.getBranchId();
        return dto;
    }

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

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
