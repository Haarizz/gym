package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Idempotency guard for auto-generated journal entries.
 *
 * The UNIQUE constraint on (source_entity_type, source_entity_id) ensures that
 * each real-world business event (a salary payment, a sale, an expense approval)
 * can only ever produce ONE journal entry — even if the originating service
 * method is called twice due to a retry, network timeout, or UI double-submit.
 *
 * Every time FinancialEventService creates a journal entry it first checks
 * this table. If a row already exists for that (type, id) pair it returns
 * without creating a duplicate entry.
 */
@Entity
@Table(name = "journal_entry_sources",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_journal_entry_source",
                columnNames = {"source_entity_type", "source_entity_id"}))
public class JournalEntrySource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to the auto-generated JournalVoucher. */
    @Column(name = "journal_voucher_id", nullable = false)
    private Long journalVoucherId;

    /** Module that triggered the entry (BILLING, PAYROLL, SALES, etc.). */
    @Column(name = "source_module", nullable = false)
    private String sourceModule;

    /** Simple class name of the source entity (Receipt, SalaryPayment, etc.). */
    @Column(name = "source_entity_type", nullable = false, length = 100)
    private String sourceEntityType;

    /** PK of the source entity row. */
    @Column(name = "source_entity_id", nullable = false)
    private Long sourceEntityId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public JournalEntrySource() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }

    public String getSourceModule() { return sourceModule; }
    public void setSourceModule(String sourceModule) { this.sourceModule = sourceModule; }

    public String getSourceEntityType() { return sourceEntityType; }
    public void setSourceEntityType(String sourceEntityType) { this.sourceEntityType = sourceEntityType; }

    public Long getSourceEntityId() { return sourceEntityId; }
    public void setSourceEntityId(Long sourceEntityId) { this.sourceEntityId = sourceEntityId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
