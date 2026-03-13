package com.company.project.entities;

import com.company.project.converters.JsonIntegerListConverter;
import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "membership_plans")
public class MembershipPlan extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Core fields ─────────────────────────────────────────────────────────

    @Column(nullable = false)
    private String name;

    /** Membership / Class Package / Personal Training */
    @Column(nullable = false)
    private String type;

    /** Individual / Family / Corporate */
    @Column(name = "plan_type")
    private String planType;

    /** Monthly / Annual / Sessions / Weekly / Quarterly */
    @Column(name = "duration_type")
    private String durationType;

    /** Numeric part of duration, e.g. "1", "12", "8" */
    @Column(name = "duration_value")
    private String durationValue;

    /** Human-readable string, e.g. "1 month", "12 months", "8 sessions" */
    private String duration;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    /** Discount in percent, e.g. 15.00 = 15% off */
    @Column(precision = 5, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    /** Active / Inactive */
    @Column(nullable = false)
    private String status = "Active";

    @Column(columnDefinition = "TEXT")
    private String description;

    // ── Session / trainer fields ─────────────────────────────────────────────

    @Column(name = "max_sessions")
    private Integer maxSessions;

    /** JSON array of trainer names, e.g. ["John Smith","Sarah Wilson"] */
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "assignable_trainers", columnDefinition = "TEXT")
    private List<String> assignableTrainers = new ArrayList<>();

    // ── Capacity fields ──────────────────────────────────────────────────────

    /** Unlimited / Limited */
    @Column(name = "membership_capacity")
    private String membershipCapacity = "Unlimited";

    @Column(name = "max_capacity")
    private Integer maxCapacity = 0;

    /** Unlimited / Limited */
    @Column(name = "attendance_limit")
    private String attendanceLimit = "Unlimited";

    @Column(name = "attendance_value")
    private Integer attendanceValue = 3;

    /** Payment / Week / Month */
    @Column(name = "attendance_period")
    private String attendancePeriod = "Payment";

    // ── Freeze policy ────────────────────────────────────────────────────────

    @Column(name = "max_freeze_days")
    private Integer maxFreezeDays = 30;

    @Column(name = "max_freeze_occurrences")
    private Integer maxFreezeOccurrences = 2;

    @Column(name = "charge_per_extra_day", precision = 10, scale = 2)
    private BigDecimal chargePerExtraDay = new BigDecimal("5.00");

    @Column(name = "free_days_allowed")
    private Integer freeDaysAllowed = 10;

    @Column(name = "auto_unfreeze")
    private boolean autoUnfreeze = true;

    // ── JSON array associations ──────────────────────────────────────────────

    /** Training stream IDs, e.g. [1,2,3] */
    @Convert(converter = JsonIntegerListConverter.class)
    @Column(name = "training_streams", columnDefinition = "TEXT")
    private List<Integer> trainingStreams = new ArrayList<>();

    /** Facility IDs, e.g. ["FAC-001","FAC-002"] */
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "selected_facilities", columnDefinition = "TEXT")
    private List<String> selectedFacilities = new ArrayList<>();

    /** Promotion IDs linked to this plan */
    @Convert(converter = JsonIntegerListConverter.class)
    @Column(name = "selected_promotions", columnDefinition = "TEXT")
    private List<Integer> selectedPromotions = new ArrayList<>();

    /** Campaign IDs linked to this plan */
    @Convert(converter = JsonIntegerListConverter.class)
    @Column(name = "selected_campaigns", columnDefinition = "TEXT")
    private List<Integer> selectedCampaigns = new ArrayList<>();

    public MembershipPlan() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPlanType() { return planType; }
    public void setPlanType(String planType) { this.planType = planType; }

    public String getDurationType() { return durationType; }
    public void setDurationType(String durationType) { this.durationType = durationType; }

    public String getDurationValue() { return durationValue; }
    public void setDurationValue(String durationValue) { this.durationValue = durationValue; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getMaxSessions() { return maxSessions; }
    public void setMaxSessions(Integer maxSessions) { this.maxSessions = maxSessions; }

    public List<String> getAssignableTrainers() { return assignableTrainers; }
    public void setAssignableTrainers(List<String> assignableTrainers) { this.assignableTrainers = assignableTrainers; }

    public String getMembershipCapacity() { return membershipCapacity; }
    public void setMembershipCapacity(String membershipCapacity) { this.membershipCapacity = membershipCapacity; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public String getAttendanceLimit() { return attendanceLimit; }
    public void setAttendanceLimit(String attendanceLimit) { this.attendanceLimit = attendanceLimit; }

    public Integer getAttendanceValue() { return attendanceValue; }
    public void setAttendanceValue(Integer attendanceValue) { this.attendanceValue = attendanceValue; }

    public String getAttendancePeriod() { return attendancePeriod; }
    public void setAttendancePeriod(String attendancePeriod) { this.attendancePeriod = attendancePeriod; }

    public Integer getMaxFreezeDays() { return maxFreezeDays; }
    public void setMaxFreezeDays(Integer maxFreezeDays) { this.maxFreezeDays = maxFreezeDays; }

    public Integer getMaxFreezeOccurrences() { return maxFreezeOccurrences; }
    public void setMaxFreezeOccurrences(Integer maxFreezeOccurrences) { this.maxFreezeOccurrences = maxFreezeOccurrences; }

    public BigDecimal getChargePerExtraDay() { return chargePerExtraDay; }
    public void setChargePerExtraDay(BigDecimal chargePerExtraDay) { this.chargePerExtraDay = chargePerExtraDay; }

    public Integer getFreeDaysAllowed() { return freeDaysAllowed; }
    public void setFreeDaysAllowed(Integer freeDaysAllowed) { this.freeDaysAllowed = freeDaysAllowed; }

    public boolean isAutoUnfreeze() { return autoUnfreeze; }
    public void setAutoUnfreeze(boolean autoUnfreeze) { this.autoUnfreeze = autoUnfreeze; }

    public List<Integer> getTrainingStreams() { return trainingStreams; }
    public void setTrainingStreams(List<Integer> trainingStreams) { this.trainingStreams = trainingStreams; }

    public List<String> getSelectedFacilities() { return selectedFacilities; }
    public void setSelectedFacilities(List<String> selectedFacilities) { this.selectedFacilities = selectedFacilities; }

    public List<Integer> getSelectedPromotions() { return selectedPromotions; }
    public void setSelectedPromotions(List<Integer> selectedPromotions) { this.selectedPromotions = selectedPromotions; }

    public List<Integer> getSelectedCampaigns() { return selectedCampaigns; }
    public void setSelectedCampaigns(List<Integer> selectedCampaigns) { this.selectedCampaigns = selectedCampaigns; }
}
