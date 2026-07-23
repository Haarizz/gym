package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO for creating / updating a MembershipPlan.
 * Uses camelCase (overrides the global SNAKE_CASE Jackson strategy)
 * because the frontend manage-plans page sends camelCase JSON.
 */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class MembershipPlanRequestDTO {

    private String name;
    private String type;
    private String planType;
    private String durationType;
    private String durationValue;
    private BigDecimal price;
    private BigDecimal discount;
    private String status;
    private String description;
    private Integer maxSessions;
    private List<String> assignableTrainers = new ArrayList<>();

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
    private Boolean autoUnfreeze;

    // JSON array associations
    private List<Integer> trainingStreams = new ArrayList<>();
    private List<String> selectedFacilities = new ArrayList<>();
    private List<Integer> selectedPromotions = new ArrayList<>();
    private List<Integer> selectedCampaigns = new ArrayList<>();

    // ── Getters & Setters ────────────────────────────────────────────────────

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

    public Boolean getAutoUnfreeze() { return autoUnfreeze; }
    public void setAutoUnfreeze(Boolean autoUnfreeze) { this.autoUnfreeze = autoUnfreeze; }

    public List<Integer> getTrainingStreams() { return trainingStreams; }
    public void setTrainingStreams(List<Integer> trainingStreams) { this.trainingStreams = trainingStreams; }

    public List<String> getSelectedFacilities() { return selectedFacilities; }
    public void setSelectedFacilities(List<String> selectedFacilities) { this.selectedFacilities = selectedFacilities; }

    public List<Integer> getSelectedPromotions() { return selectedPromotions; }
    public void setSelectedPromotions(List<Integer> selectedPromotions) { this.selectedPromotions = selectedPromotions; }

    public List<Integer> getSelectedCampaigns() { return selectedCampaigns; }
    public void setSelectedCampaigns(List<Integer> selectedCampaigns) { this.selectedCampaigns = selectedCampaigns; }
}
