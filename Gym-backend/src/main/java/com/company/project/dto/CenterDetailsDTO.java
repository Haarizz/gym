package com.company.project.dto;

import java.math.BigDecimal;
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
    private Integer establishedYear;
    private String coverImageUrl;
    private List<String> galleryImageUrls;
    private List<String> acceptedPaymentMethods;
    private boolean bnplEnabled;
    private String bnplProvider;
    private BigDecimal taxPercentage;
    private boolean taxInclusive;
    private String termsAndPolicies;
    private Double avgRating;
    private Long reviewCount;

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

    public Integer getEstablishedYear() { return establishedYear; }
    public void setEstablishedYear(Integer establishedYear) { this.establishedYear = establishedYear; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public List<String> getGalleryImageUrls() { return galleryImageUrls; }
    public void setGalleryImageUrls(List<String> galleryImageUrls) { this.galleryImageUrls = galleryImageUrls; }

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

    public Double getAvgRating() { return avgRating; }
    public void setAvgRating(Double avgRating) { this.avgRating = avgRating; }

    public Long getReviewCount() { return reviewCount; }
    public void setReviewCount(Long reviewCount) { this.reviewCount = reviewCount; }
}
