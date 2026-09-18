package com.company.project.dto;

public class AccessControlDeviceRequestDTO {

    private String deviceCode;
    private String name;
    private String deviceType;
    private String location;
    private String status;
    private Long branchId;

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

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
