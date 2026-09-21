package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "branches")
public class Branch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_name", nullable = false)
    private String branchName;

    @Column(name = "branch_code", unique = true, nullable = false)
    private String branchCode;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String phone;

    private String email;

    private Double lat;
    private Double lng;

    @Column(name = "center_type")
    private String centerType;

    @Column(name = "access_type")
    private String accessType;

    @Column(name = "operating_hours", columnDefinition = "TEXT")
    private String operatingHours;

    // Public-facing description shown in mobile discovery. Distinct from the
    // internal Gym.address that CenterDetailsDTO.about used to be mocked to.
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "established_year")
    private Integer establishedYear;

    // CSV of accepted payment methods for mobile discovery display, e.g. "Cash,Card".
    // Deliberately not the PaymentMethod enum — that enum records what a member
    // actually paid with on a specific transaction, not what a branch accepts.
    @Column(name = "accepted_payment_methods")
    private String acceptedPaymentMethods;

    // columnDefinition (not just nullable=false) is required here: local dev's
    // ddl-auto=update ALTERs this onto branches tables that already have rows
    // (spring.flyway.enabled=false locally — see application-local.properties),
    // and Hibernate's generated ALTER for a bare NOT NULL column has no DEFAULT,
    // which Postgres rejects against existing rows. Matches BaseEntity.createdAt's
    // own columnDefinition-with-default pattern.
    @Column(name = "bnpl_enabled", columnDefinition = "boolean not null default false")
    private boolean bnplEnabled = false;

    @Column(name = "bnpl_provider")
    private String bnplProvider;

    // Display-facing tax rate shown at mobile checkout — distinct from
    // CompanyTaxDetails, which holds registration/compliance data (GST/VAT numbers).
    @Column(name = "tax_percentage", precision = 5, scale = 2)
    private BigDecimal taxPercentage;

    @Column(name = "tax_inclusive", columnDefinition = "boolean not null default false")
    private boolean taxInclusive = false;

    @Column(name = "terms_and_policies", columnDefinition = "TEXT")
    private String termsAndPolicies;

    // ACTIVE / INACTIVE
    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    public Branch() {}

    public Branch(String branchName, String branchCode) {
        this.branchName = branchName;
        this.branchCode = branchCode;
    }

    // Getters and Setters
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

    public String getAcceptedPaymentMethods() { return acceptedPaymentMethods; }
    public void setAcceptedPaymentMethods(String acceptedPaymentMethods) { this.acceptedPaymentMethods = acceptedPaymentMethods; }

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
