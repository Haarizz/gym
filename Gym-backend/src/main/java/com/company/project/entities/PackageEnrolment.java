package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One member's purchase of a {@link TrainingPackage}. It is sold through the add-on flow, so the
 * payment, receipt, wallet, approval and refund live on its {@link MemberAddon}; this row holds
 * the package rules (copied at sale) and the trainer. Sessions used are counted from the
 * bookings linked to it, never stored, so they can't drift.
 *
 * Only active and cancelled are stored; completed / expired / upcoming are worked out on read
 * (see PackageEnrolmentService.displayStatus).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@EntityListeners(com.company.project.performance.events.PerformanceSourceListener.class)
@Table(name = "package_enrolments")
public class PackageEnrolment extends BaseEntity implements BranchAware {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_CANCELLED = "cancelled";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "package_id", nullable = false)
    private Long packageId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "member_addon_id")
    private Long memberAddonId;

    @Column(name = "trainer_id")
    private Long trainerId;

    @Column(name = "package_name", nullable = false)
    private String packageName;

    @Column(name = "plan_type", nullable = false, length = 10)
    private String planType;

    /** Sessions the member can use (null = unlimited day-based). */
    @Column(name = "sessions_total")
    private Integer sessionsTotal;

    @Column(name = "validity_days", nullable = false)
    private Integer validityDays;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Last valid day: start + validity − 1. */
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "commission_timing", nullable = false, length = 12)
    private String commissionTiming;

    @Column(name = "unused_at_expiry", nullable = false, length = 15)
    private String unusedAtExpiry;

    @Column(name = "no_show_policy", nullable = false, length = 12)
    private String noShowPolicy;

    @Column(nullable = false, length = 12)
    private String status = STATUS_ACTIVE;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "branch_id")
    private Long branchId;

    public boolean noShowCounts() {
        return !TrainingPackage.NO_SHOW_NOT_COUNTED.equals(noShowPolicy);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPackageId() { return packageId; }
    public void setPackageId(Long packageId) { this.packageId = packageId; }
    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }
    public Long getMemberAddonId() { return memberAddonId; }
    public void setMemberAddonId(Long memberAddonId) { this.memberAddonId = memberAddonId; }
    public Long getTrainerId() { return trainerId; }
    public void setTrainerId(Long trainerId) { this.trainerId = trainerId; }
    public String getPackageName() { return packageName; }
    public void setPackageName(String packageName) { this.packageName = packageName; }
    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }
    public Integer getSessionsTotal() { return sessionsTotal; }
    public void setSessionsTotal(Integer sessionsTotal) { this.sessionsTotal = sessionsTotal; }
    public Integer getValidityDays() { return validityDays; }
    public void setValidityDays(Integer validityDays) { this.validityDays = validityDays; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getCommissionTiming() { return commissionTiming; }
    public void setCommissionTiming(String commissionTiming) { this.commissionTiming = commissionTiming; }
    public String getUnusedAtExpiry() { return unusedAtExpiry; }
    public void setUnusedAtExpiry(String unusedAtExpiry) { this.unusedAtExpiry = unusedAtExpiry; }
    public String getNoShowPolicy() { return noShowPolicy; }
    public void setNoShowPolicy(String noShowPolicy) { this.noShowPolicy = noShowPolicy; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
