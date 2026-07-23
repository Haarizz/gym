package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tax_compliance")
public class TaxCompliance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tax_type", nullable = false)
    private String taxType; // VAT, CORPORATE_TAX, WITHHOLDING_TAX

    @Column(name = "tax_period", nullable = false)
    private String taxPeriod;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "filed_date")
    private LocalDate filedDate;

    @Column(name = "filing_amount", precision = 12, scale = 2)
    private BigDecimal filingAmount;

    @Column(name = "status")
    private String status; // PENDING, FILED, OVERDUE, EXEMPT

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "filing_reference")
    private String filingReference;

    @Column(name = "document_url")
    private String documentUrl;

    public TaxCompliance() {}

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
}
