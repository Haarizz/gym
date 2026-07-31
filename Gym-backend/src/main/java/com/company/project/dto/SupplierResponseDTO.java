package com.company.project.dto;

import com.company.project.entities.Supplier;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SupplierResponseDTO {

    private Long id;
    private String name;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private String taxId;
    private String paymentTerms;
    private BigDecimal creditLimit;
    private Boolean isActive;
    private Double rating;
    private String notes;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public SupplierResponseDTO() {}

    public static SupplierResponseDTO fromEntity(Supplier s) {
        SupplierResponseDTO dto = new SupplierResponseDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setContactPerson(s.getContactPerson());
        dto.setEmail(s.getEmail());
        dto.setPhone(s.getPhone());
        dto.setAddress(s.getAddress());
        dto.setCity(s.getCity());
        dto.setCountry(s.getCountry());
        dto.setTaxId(s.getTaxId());
        dto.setPaymentTerms(s.getPaymentTerms());
        dto.setCreditLimit(s.getCreditLimit());
        dto.setIsActive(s.getIsActive());
        dto.setRating(s.getRating());
        dto.setNotes(s.getNotes());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getTaxId() { return taxId; }
    public void setTaxId(String taxId) { this.taxId = taxId; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
