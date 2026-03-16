package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "staff_certifications")
public class StaffCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_db_id", nullable = false)
    private Staff staff;

    @Column(name = "cert_name")
    private String certName;

    private String issuer;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "document_url")
    private String documentUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }
    public String getCertName() { return certName; }
    public void setCertName(String certName) { this.certName = certName; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
}
