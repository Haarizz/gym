package com.company.project.dto;

import com.company.project.entities.MembershipPlan;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Response DTO for MembershipPlan.
 * Uses camelCase (overrides global SNAKE_CASE) because the frontend
 * manage-plans.tsx accesses plan properties with camelCase keys.
 */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class MembershipPlanResponseDTO {

    private Long id;
    private String name;
    private String type;
    private String planType;
    private String durationType;
    private String durationValue;
    private String duration;
    private BigDecimal price;
    private BigDecimal discount;
    private String status;
    private String description;
    private Integer maxSessions;
    private List<String> assignableTrainers;

    // Capacity
    private String membershipCapacity;
    private Integer maxCapacity;
    private String attendanceLimit;
    private Integer attendanceValue;
    private String attendancePeriod;

    // Freeze policy
    private Integer maxFreezeDays;
    private Integer maxFreezeOccurrences;
    private BigDecimal chargePerExtraDay;
    private Integer freeDaysAllowed;
    private boolean autoUnfreeze;

    // JSON array associations
    private List<Integer> trainingStreams;
    private List<String> selectedFacilities;
    private List<Integer> selectedPromotions;
    private List<Integer> selectedCampaigns;

    // Audit
    private String createdAt;
    private String updatedAt;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static MembershipPlanResponseDTO fromEntity(MembershipPlan p) {
        MembershipPlanResponseDTO dto = new MembershipPlanResponseDTO();
        dto.id                  = p.getId();
        dto.name                = p.getName();
        dto.type                = p.getType();
        dto.planType            = p.getPlanType();
        dto.durationType        = p.getDurationType();
        dto.durationValue       = p.getDurationValue();
        dto.duration            = p.getDuration();
        dto.price               = p.getPrice();
        dto.discount            = p.getDiscount() != null ? p.getDiscount() : BigDecimal.ZERO;
        dto.status              = p.getStatus();
        dto.description         = p.getDescription();
        dto.maxSessions         = p.getMaxSessions();
        dto.assignableTrainers  = p.getAssignableTrainers();
        dto.membershipCapacity  = p.getMembershipCapacity();
        dto.maxCapacity         = p.getMaxCapacity();
        dto.attendanceLimit     = p.getAttendanceLimit();
        dto.attendanceValue     = p.getAttendanceValue();
        dto.attendancePeriod    = p.getAttendancePeriod();
        dto.maxFreezeDays       = p.getMaxFreezeDays();
        dto.maxFreezeOccurrences= p.getMaxFreezeOccurrences();
        dto.chargePerExtraDay   = p.getChargePerExtraDay();
        dto.freeDaysAllowed     = p.getFreeDaysAllowed();
        dto.autoUnfreeze        = p.isAutoUnfreeze();
        dto.trainingStreams      = p.getTrainingStreams();
        dto.selectedFacilities  = p.getSelectedFacilities();
        dto.selectedPromotions  = p.getSelectedPromotions();
        dto.selectedCampaigns   = p.getSelectedCampaigns();
        dto.createdAt           = p.getCreatedAt() != null ? p.getCreatedAt().format(ISO) + "Z" : null;
        dto.updatedAt           = p.getUpdatedAt() != null ? p.getUpdatedAt().format(ISO) + "Z" : null;
        return dto;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getPlanType() { return planType; }
    public String getDurationType() { return durationType; }
    public String getDurationValue() { return durationValue; }
    public String getDuration() { return duration; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getDiscount() { return discount; }
    public String getStatus() { return status; }
    public String getDescription() { return description; }
    public Integer getMaxSessions() { return maxSessions; }
    public List<String> getAssignableTrainers() { return assignableTrainers; }
    public String getMembershipCapacity() { return membershipCapacity; }
    public Integer getMaxCapacity() { return maxCapacity; }
    public String getAttendanceLimit() { return attendanceLimit; }
    public Integer getAttendanceValue() { return attendanceValue; }
    public String getAttendancePeriod() { return attendancePeriod; }
    public Integer getMaxFreezeDays() { return maxFreezeDays; }
    public Integer getMaxFreezeOccurrences() { return maxFreezeOccurrences; }
    public BigDecimal getChargePerExtraDay() { return chargePerExtraDay; }
    public Integer getFreeDaysAllowed() { return freeDaysAllowed; }
    public boolean isAutoUnfreeze() { return autoUnfreeze; }
    public List<Integer> getTrainingStreams() { return trainingStreams; }
    public List<String> getSelectedFacilities() { return selectedFacilities; }
    public List<Integer> getSelectedPromotions() { return selectedPromotions; }
    public List<Integer> getSelectedCampaigns() { return selectedCampaigns; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
}
