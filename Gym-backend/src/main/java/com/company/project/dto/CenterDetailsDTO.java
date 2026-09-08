package com.company.project.dto;

import java.util.List;

public class CenterDetailsDTO {
    private String tenantSlug;
    private Long branchId;
    private String centerName;
    private String address;
    private Double lat;
    private Double lng;
    private String centerType;
    private String phone;
    private String operatingHours;
    private String accessType;
    private String about;
    
    private List<FacilityResponseDTO> amenities;
    private List<StaffResponseDTO> trainers;

    // Getters and Setters
    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getCenterName() { return centerName; }
    public void setCenterName(String centerName) { this.centerName = centerName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getCenterType() { return centerType; }
    public void setCenterType(String centerType) { this.centerType = centerType; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOperatingHours() { return operatingHours; }
    public void setOperatingHours(String operatingHours) { this.operatingHours = operatingHours; }

    public String getAccessType() { return accessType; }
    public void setAccessType(String accessType) { this.accessType = accessType; }

    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }

    public List<FacilityResponseDTO> getAmenities() { return amenities; }
    public void setAmenities(List<FacilityResponseDTO> amenities) { this.amenities = amenities; }

    public List<StaffResponseDTO> getTrainers() { return trainers; }
    public void setTrainers(List<StaffResponseDTO> trainers) { this.trainers = trainers; }
}
