package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * A PT package admins sell (docs/training-packages-commission-plan.md): session-based
 * ("15 sessions within 60 days") or day-based ("30 days", optionally capped at N sessions).
 * It also says when the trainer's commission counts — on enrolment, or as the package is used —
 * and two admin policies. Each sale copies these settings onto its {@link PackageEnrolment}, so
 * editing a package never changes packages already sold.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "training_packages")
public class TrainingPackage extends BaseEntity implements BranchAware {

    public static final String KIND_PT = "pt";
    public static final String TYPE_SESSIONS = "sessions";
    public static final String TYPE_DAYS = "days";
    public static final String TIMING_ENROLMENT = "enrolment";
    public static final String TIMING_COMPLETION = "completion";
    public static final String UNUSED_FORFEIT = "forfeit";
    public static final String UNUSED_PAY_AT_EXPIRY = "pay_at_expiry";
    public static final String NO_SHOW_COUNTS = "counts";
    public static final String NO_SHOW_NOT_COUNTED = "not_counted";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 10)
    private String kind = KIND_PT;

    /** sessions | days */
    @Column(name = "plan_type", nullable = false, length = 10)
    private String planType;

    /** Sessions included, for a session-based package. */
    @Column(name = "session_count")
    private Integer sessionCount;

    /** Optional most sessions a day-based package allows (null = unlimited). */
    @Column(name = "session_cap")
    private Integer sessionCap;

    @Column(name = "validity_days", nullable = false)
    private Integer validityDays;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "default_trainer_id")
    private Long defaultTrainerId;

    /** enrolment | completion */
    @Column(name = "commission_timing", nullable = false, length = 12)
    private String commissionTiming = TIMING_ENROLMENT;

    /** forfeit | pay_at_expiry — completion timing only. */
    @Column(name = "unused_at_expiry", nullable = false, length = 15)
    private String unusedAtExpiry = UNUSED_FORFEIT;

    /** counts | not_counted — whether a no-show uses up a session. */
    @Column(name = "no_show_policy", nullable = false, length = 12)
    private String noShowPolicy = NO_SHOW_COUNTS;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "branch_id")
    private Long branchId;

    /** Sessions a member can use: the count for session-based, the cap (or null) for day-based. */
    public Integer sessionLimit() {
        return TYPE_SESSIONS.equals(planType) ? sessionCount : sessionCap;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }
    public Integer getSessionCount() { return sessionCount; }
    public void setSessionCount(Integer sessionCount) { this.sessionCount = sessionCount; }
    public Integer getSessionCap() { return sessionCap; }
    public void setSessionCap(Integer sessionCap) { this.sessionCap = sessionCap; }
    public Integer getValidityDays() { return validityDays; }
    public void setValidityDays(Integer validityDays) { this.validityDays = validityDays; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Long getDefaultTrainerId() { return defaultTrainerId; }
    public void setDefaultTrainerId(Long defaultTrainerId) { this.defaultTrainerId = defaultTrainerId; }
    public String getCommissionTiming() { return commissionTiming; }
    public void setCommissionTiming(String commissionTiming) { this.commissionTiming = commissionTiming; }
    public String getUnusedAtExpiry() { return unusedAtExpiry; }
    public void setUnusedAtExpiry(String unusedAtExpiry) { this.unusedAtExpiry = unusedAtExpiry; }
    public String getNoShowPolicy() { return noShowPolicy; }
    public void setNoShowPolicy(String noShowPolicy) { this.noShowPolicy = noShowPolicy; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
