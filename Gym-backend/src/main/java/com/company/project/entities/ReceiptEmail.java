package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** One receipt / invoice email sent to a member from Billing (V134), sent or failed. */
@Entity
@Table(name = "receipt_emails")
public class ReceiptEmail {

    public static final String RECEIPT = "RECEIPT";
    public static final String INVOICE = "INVOICE";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "document_type", nullable = false)
    private String documentType;

    @Column(name = "to_email", nullable = false, columnDefinition = "TEXT")
    private String toEmail;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "sent_by")
    private String sentBy;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getSentBy() { return sentBy; }
    public void setSentBy(String sentBy) { this.sentBy = sentBy; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
