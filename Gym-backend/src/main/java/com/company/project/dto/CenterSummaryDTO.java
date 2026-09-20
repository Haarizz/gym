package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class CenterSummaryDTO {
    private String tenantSlug;
    private Long branchId;
    private String centerName;
    private String address;
    private Double lat;
    private Double lng;
    private String centerType;
    private BigDecimal startingPrice;
    private String accessType;
    private String coverImageUrl;
    private Double avgRating;
    private Long reviewCount;
    private List<String> acceptedPaymentMethods;

    // Getters and setters
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

    public BigDecimal getStartingPrice() { return startingPrice; }
    public void setStartingPrice(BigDecimal startingPrice) { this.startingPrice = startingPrice; }

    public String getAccessType() { return accessType; }
    public void setAccessType(String accessType) { this.accessType = accessType; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public Double getAvgRating() { return avgRating; }
    public void setAvgRating(Double avgRating) { this.avgRating = avgRating; }

    public Long getReviewCount() { return reviewCount; }
    public void setReviewCount(Long reviewCount) { this.reviewCount = reviewCount; }

    public List<String> getAcceptedPaymentMethods() { return acceptedPaymentMethods; }
    public void setAcceptedPaymentMethods(List<String> acceptedPaymentMethods) { this.acceptedPaymentMethods = acceptedPaymentMethods; }
}
