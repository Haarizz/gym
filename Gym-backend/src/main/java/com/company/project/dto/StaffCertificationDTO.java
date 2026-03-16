package com.company.project.dto;

import com.company.project.entities.StaffCertification;

public class StaffCertificationDTO {
    private Long id;
    private String certName;
    private String issuer;
    private String issueDate;
    private String expiryDate;
    private String documentUrl;

    public static StaffCertificationDTO fromEntity(StaffCertification c) {
        StaffCertificationDTO dto = new StaffCertificationDTO();
        dto.id = c.getId();
        dto.certName = c.getCertName();
        dto.issuer = c.getIssuer();
        dto.issueDate = c.getIssueDate() != null ? c.getIssueDate().toString() : null;
        dto.expiryDate = c.getExpiryDate() != null ? c.getExpiryDate().toString() : null;
        dto.documentUrl = c.getDocumentUrl();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCertName() { return certName; }
    public void setCertName(String certName) { this.certName = certName; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getIssueDate() { return issueDate; }
    public void setIssueDate(String issueDate) { this.issueDate = issueDate; }
    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
}
