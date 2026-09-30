package com.company.project.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One freeze of a member's membership. The plan's freeze policy is a budget per
 * plan period (total days, number of freezes, free days), so every freeze is
 * recorded here — whether the member requested it in the app or staff applied it
 * on the Web — and the running totals are summed from these rows.
 *
 * A freeze still in progress has endedAt == null and counts its requestedDays
 * against the budget; once ended it counts the days it actually lasted.
 */
@Entity
@Table(name = "membership_freezes")
public class MembershipFreeze {

    public static final String SOURCE_MOBILE = "MOBILE";
    public static final String SOURCE_STAFF = "STAFF";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_db_id", nullable = false)
    private Long memberDbId;

    @Column(name = "plan_name")
    private String planName;

    @Column(name = "freeze_start", nullable = false)
    private LocalDateTime freezeStart;

    @Column(name = "planned_end")
    private LocalDateTime plannedEnd;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "requested_days", nullable = false)
    private int requestedDays;

    /** Days of this freeze covered by the plan's free allowance. */
    @Column(name = "free_days_applied", nullable = false)
    private int freeDaysApplied;

    /** Days of this freeze billed at chargePerDay. */
    @Column(name = "charged_days", nullable = false)
    private int chargedDays;

    @Column(name = "charge_per_day", precision = 10, scale = 2)
    private BigDecimal chargePerDay;

    @Column(name = "charge_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal chargeAmount = BigDecimal.ZERO;

    /** The "Freeze Charge" bill (Receipt) raised for chargedDays, if any. */
    @Column(name = "charge_receipt_id")
    private Long chargeReceiptId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public LocalDateTime getFreezeStart() { return freezeStart; }
    public void setFreezeStart(LocalDateTime freezeStart) { this.freezeStart = freezeStart; }

    public LocalDateTime getPlannedEnd() { return plannedEnd; }
    public void setPlannedEnd(LocalDateTime plannedEnd) { this.plannedEnd = plannedEnd; }

    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }

    public int getRequestedDays() { return requestedDays; }
    public void setRequestedDays(int requestedDays) { this.requestedDays = requestedDays; }

    public int getFreeDaysApplied() { return freeDaysApplied; }
    public void setFreeDaysApplied(int freeDaysApplied) { this.freeDaysApplied = freeDaysApplied; }

    public int getChargedDays() { return chargedDays; }
    public void setChargedDays(int chargedDays) { this.chargedDays = chargedDays; }

    public BigDecimal getChargePerDay() { return chargePerDay; }
    public void setChargePerDay(BigDecimal chargePerDay) { this.chargePerDay = chargePerDay; }

    public BigDecimal getChargeAmount() { return chargeAmount; }
    public void setChargeAmount(BigDecimal chargeAmount) { this.chargeAmount = chargeAmount; }

    public Long getChargeReceiptId() { return chargeReceiptId; }
    public void setChargeReceiptId(Long chargeReceiptId) { this.chargeReceiptId = chargeReceiptId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
