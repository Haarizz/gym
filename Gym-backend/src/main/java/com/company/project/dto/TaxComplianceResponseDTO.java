package com.company.project.dto;

import com.company.project.entities.TaxCompliance;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaxComplianceResponseDTO {

    private Long id;
    private String taxType;
    private String taxPeriod;
    private LocalDate dueDate;
    private LocalDate filedDate;
    private BigDecimal filingAmount;
    private String status;
    private String notes;
    private String filingReference;
    private String documentUrl;
    private boolean isOverdue;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public TaxComplianceResponseDTO() {}

    public static TaxComplianceResponseDTO fromEntity(TaxCompliance t) {
        TaxComplianceResponseDTO dto = new TaxComplianceResponseDTO();
        dto.setId(t.getId());
        dto.setTaxType(t.getTaxType());
        dto.setTaxPeriod(t.getTaxPeriod());
        dto.setDueDate(t.getDueDate());
        dto.setFiledDate(t.getFiledDate());
        dto.setFilingAmount(t.getFilingAmount());
        dto.setStatus(t.getStatus());
        dto.setNotes(t.getNotes());
        dto.setFilingReference(t.getFilingReference());
        dto.setDocumentUrl(t.getDocumentUrl());
        dto.setOverdue(t.getDueDate() != null
                && LocalDate.now().isAfter(t.getDueDate())
                && "PENDING".equalsIgnoreCase(t.getStatus()));
        dto.setCreatedAt(t.getCreatedAt());
        dto.setUpdatedAt(t.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public String getTaxPeriod() { return taxPeriod; }
    public void setTaxPeriod(String taxPeriod) { this.taxPeriod = taxPeriod; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalDate getFiledDate() { return filedDate; }
    public void setFiledDate(LocalDate filedDate) { this.filedDate = filedDate; }

    public BigDecimal getFilingAmount() { return filingAmount; }
    public void setFilingAmount(BigDecimal filingAmount) { this.filingAmount = filingAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getFilingReference() { return filingReference; }
    public void setFilingReference(String filingReference) { this.filingReference = filingReference; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public boolean isOverdue() { return isOverdue; }
    public void setOverdue(boolean overdue) { isOverdue = overdue; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
