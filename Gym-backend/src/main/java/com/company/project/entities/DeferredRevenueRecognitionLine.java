package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One monthly amortization bucket belonging to a DeferredRevenueSchedule.
 * DeferredRevenueRecognitionScheduler posts every PENDING line whose
 * periodEnd has passed via FinancialEventService.onDeferredRevenueRecognized().
 */
@Entity
@Table(name = "deferred_revenue_recognition_lines")
public class DeferredRevenueRecognitionLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId;

    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    // PENDING | POSTED
    @Column(name = "status", nullable = false)
    private String status = "PENDING";

    @Column(name = "recognized_journal_voucher_id")
    private Long recognizedJournalVoucherId;

    @Column(name = "recognized_at")
    private LocalDateTime recognizedAt;

    public DeferredRevenueRecognitionLine() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getScheduleId() { return scheduleId; }
    public void setScheduleId(Long scheduleId) { this.scheduleId = scheduleId; }

    public Integer getPeriodNumber() { return periodNumber; }
    public void setPeriodNumber(Integer periodNumber) { this.periodNumber = periodNumber; }

    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }

    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getRecognizedJournalVoucherId() { return recognizedJournalVoucherId; }
    public void setRecognizedJournalVoucherId(Long recognizedJournalVoucherId) { this.recognizedJournalVoucherId = recognizedJournalVoucherId; }

    public LocalDateTime getRecognizedAt() { return recognizedAt; }
    public void setRecognizedAt(LocalDateTime recognizedAt) { this.recognizedAt = recognizedAt; }
}
