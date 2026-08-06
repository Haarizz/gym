package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One row per Receipt whose membership period spans more than one calendar
 * month — tracks how much of that payment has been recognized as Membership
 * Revenue so far vs. how much is still sitting in Deferred Revenue (2300).
 *
 * Created by DeferredRevenueScheduleService.createSchedule() right after
 * FinancialEventService.onMemberPaymentReceived() posts the initial
 * DR Cash/Bank / CR Deferred Revenue journal entry.
 */
@Entity
@Table(name = "deferred_revenue_schedules")
public class DeferredRevenueSchedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "member_db_id")
    private Long memberDbId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "plan_name")
    private String planName;

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "recognized_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal recognizedAmount = BigDecimal.ZERO;

    @Column(name = "remaining_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal remainingAmount;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_periods", nullable = false)
    private Integer totalPeriods;

    // ACTIVE | COMPLETED
    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    /** The DR Cash/Bank / CR Deferred Revenue voucher that funded this schedule. */
    @Column(name = "source_journal_voucher_id", nullable = false)
    private Long sourceJournalVoucherId;

    public DeferredRevenueSchedule() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getRecognizedAmount() { return recognizedAmount; }
    public void setRecognizedAmount(BigDecimal recognizedAmount) { this.recognizedAmount = recognizedAmount; }

    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Integer getTotalPeriods() { return totalPeriods; }
    public void setTotalPeriods(Integer totalPeriods) { this.totalPeriods = totalPeriods; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getSourceJournalVoucherId() { return sourceJournalVoucherId; }
    public void setSourceJournalVoucherId(Long sourceJournalVoucherId) { this.sourceJournalVoucherId = sourceJournalVoucherId; }
}
