package com.company.project.performance.events;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One credited activity (plan §4.2). Append-only: a refund, void, cancellation or reassignment
 * never edits a row, it adds a correction (revision 1, 2, …) pointing at the original.
 *
 * Deliberately not branch-filtered: a person's month can span branches, so readers name the
 * branch they want explicitly.
 */
@Entity
@Table(name = "performance_events")
public class PerformanceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "metric", nullable = false, length = 40)
    private String metric;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "source_type", nullable = false, length = 20)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    /** Which credit of the row this is, when one row earns several for the same metric and person ("" otherwise). */
    @Column(name = "part", nullable = false, length = 40)
    private String part = "";

    @Column(name = "revision", nullable = false)
    private int revision;

    @Column(name = "reverses_event_id")
    private Long reversesEventId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }
    public String getPart() { return part; }
    public void setPart(String part) { this.part = part != null ? part : ""; }

    public int getRevision() { return revision; }
    public void setRevision(int revision) { this.revision = revision; }
    public Long getReversesEventId() { return reversesEventId; }
    public void setReversesEventId(Long reversesEventId) { this.reversesEventId = reversesEventId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
