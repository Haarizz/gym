package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TaxComplianceRequestDTO {

    private String taxType;
    private String taxPeriod;
    private LocalDate dueDate;
    private BigDecimal filingAmount;
    private String status;
    private String notes;
    private String documentUrl;

    public TaxComplianceRequestDTO() {}

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public String getTaxPeriod() { return taxPeriod; }
    public void setTaxPeriod(String taxPeriod) { this.taxPeriod = taxPeriod; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public BigDecimal getFilingAmount() { return filingAmount; }
    public void setFilingAmount(BigDecimal filingAmount) { this.filingAmount = filingAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
}
