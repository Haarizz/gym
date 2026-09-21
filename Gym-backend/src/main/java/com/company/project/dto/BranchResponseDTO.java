package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class BranchResponseDTO {
    private Long id;
    private String branchName;
    private String branchCode;
    private String address;
    private String phone;
    private String email;
    private String status;
    private boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long staffCount;
    private long trainerCount;
    private long memberCount;
    private Double lat;
    private Double lng;
    private String centerType;
    private String accessType;
    private String operatingHours;
    private String description;
    private Integer establishedYear;
    private List<String> acceptedPaymentMethods;
    private boolean bnplEnabled;
    private String bnplProvider;
    private BigDecimal taxPercentage;
    private boolean taxInclusive;
    private String termsAndPolicies;

    public BranchResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public String getBranchCode() { return branchCode; }
    public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean isDefault) { this.isDefault = isDefault; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public long getStaffCount() { return staffCount; }
    public void setStaffCount(long staffCount) { this.staffCount = staffCount; }

    public long getTrainerCount() { return trainerCount; }
    public void setTrainerCount(long trainerCount) { this.trainerCount = trainerCount; }

    public long getMemberCount() { return memberCount; }
    public void setMemberCount(long memberCount) { this.memberCount = memberCount; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getCenterType() { return centerType; }
    public void setCenterType(String centerType) { this.centerType = centerType; }

    public String getAccessType() { return accessType; }
    public void setAccessType(String accessType) { this.accessType = accessType; }

    public String getOperatingHours() { return operatingHours; }
    public void setOperatingHours(String operatingHours) { this.operatingHours = operatingHours; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getEstablishedYear() { return establishedYear; }
    public void setEstablishedYear(Integer establishedYear) { this.establishedYear = establishedYear; }

    public List<String> getAcceptedPaymentMethods() { return acceptedPaymentMethods; }
    public void setAcceptedPaymentMethods(List<String> acceptedPaymentMethods) { this.acceptedPaymentMethods = acceptedPaymentMethods; }

    public boolean isBnplEnabled() { return bnplEnabled; }
    public void setBnplEnabled(boolean bnplEnabled) { this.bnplEnabled = bnplEnabled; }

    public String getBnplProvider() { return bnplProvider; }
    public void setBnplProvider(String bnplProvider) { this.bnplProvider = bnplProvider; }

    public BigDecimal getTaxPercentage() { return taxPercentage; }
    public void setTaxPercentage(BigDecimal taxPercentage) { this.taxPercentage = taxPercentage; }

    public boolean isTaxInclusive() { return taxInclusive; }
    public void setTaxInclusive(boolean taxInclusive) { this.taxInclusive = taxInclusive; }

    public String getTermsAndPolicies() { return termsAndPolicies; }
    public void setTermsAndPolicies(String termsAndPolicies) { this.termsAndPolicies = termsAndPolicies; }
}
