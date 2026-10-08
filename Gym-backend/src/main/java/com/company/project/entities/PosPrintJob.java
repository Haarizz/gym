package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A print job (BillBull PosPrintJob). Network jobs are sent by the server and keep their payload until
 * they succeed so a failure can be retried; agent / browser prints are reported by the till.
 * status: QUEUED, DISPATCHED, SUCCEEDED, FAILED or CANCELLED.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_print_jobs")
public class PosPrintJob extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "job_type", length = 20, nullable = false)
    private String jobType;

    @Column(name = "printer_id")
    private Long printerId;

    @Column(name = "printer_name", length = 120)
    private String printerName;

    @Column(name = "connection_type", length = 20)
    private String connectionType;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "source_type", length = 40)
    private String sourceType;

    @Column(name = "source_ref", length = 60)
    private String sourceRef;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "payload_bytes")
    private Integer payloadBytes;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "QUEUED";

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts = 3;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "dispatched_at")
    private java.time.LocalDateTime dispatchedAt;

    @Column(name = "completed_at")
    private java.time.LocalDateTime completedAt;

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    public PosPrintJob() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getJobType() { return jobType; }
    public void setJobType(String jobType) { this.jobType = jobType; }

    public Long getPrinterId() { return printerId; }
    public void setPrinterId(Long printerId) { this.printerId = printerId; }

    public String getPrinterName() { return printerName; }
    public void setPrinterName(String printerName) { this.printerName = printerName; }

    public String getConnectionType() { return connectionType; }
    public void setConnectionType(String connectionType) { this.connectionType = connectionType; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public String getSourceRef() { return sourceRef; }
    public void setSourceRef(String sourceRef) { this.sourceRef = sourceRef; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public Integer getPayloadBytes() { return payloadBytes; }
    public void setPayloadBytes(Integer payloadBytes) { this.payloadBytes = payloadBytes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public java.time.LocalDateTime getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(java.time.LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }

    public java.time.LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(java.time.LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
}
