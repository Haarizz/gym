package com.company.project.dto.mobile.leads;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class CreateMobileStaffLeadRequestDTO {

    // Lead Information (Omitting assignedStaff and leadId)
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String status;
    private String source;
    private String priority;
    private Integer interestLevel;
    private String notes;
    private List<String> tags;
    private String membershipInterest;
    private BigDecimal budget;
    private String preferredContactMethod;
    private Integer leadScore;

    // Follow-Up Information (Omitting assignedStaff, leadId)
    private String followUpType;
    private String followUpStatus;
    private String followUpPriority;
    private LocalDateTime followUpDueDate;
    private String followUpScheduledTime;
    private String followUpSubject;
    private String followUpNotes;
    private List<String> followUpTags;
    private String followUpMembershipStatus;
    private String followUpMembershipPlan;
    private String followUpReason;
    private Integer followUpEstimatedDuration;
    private String followUpOutcome;

    // Getters and Setters

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Integer getInterestLevel() { return interestLevel; }
    public void setInterestLevel(Integer interestLevel) { this.interestLevel = interestLevel; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getMembershipInterest() { return membershipInterest; }
    public void setMembershipInterest(String membershipInterest) { this.membershipInterest = membershipInterest; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public String getPreferredContactMethod() { return preferredContactMethod; }
    public void setPreferredContactMethod(String preferredContactMethod) { this.preferredContactMethod = preferredContactMethod; }

    public Integer getLeadScore() { return leadScore; }
    public void setLeadScore(Integer leadScore) { this.leadScore = leadScore; }

    public String getFollowUpType() { return followUpType; }
    public void setFollowUpType(String followUpType) { this.followUpType = followUpType; }

    public String getFollowUpStatus() { return followUpStatus; }
    public void setFollowUpStatus(String followUpStatus) { this.followUpStatus = followUpStatus; }

    public String getFollowUpPriority() { return followUpPriority; }
    public void setFollowUpPriority(String followUpPriority) { this.followUpPriority = followUpPriority; }

    public LocalDateTime getFollowUpDueDate() { return followUpDueDate; }
    public void setFollowUpDueDate(LocalDateTime followUpDueDate) { this.followUpDueDate = followUpDueDate; }

    public String getFollowUpScheduledTime() { return followUpScheduledTime; }
    public void setFollowUpScheduledTime(String followUpScheduledTime) { this.followUpScheduledTime = followUpScheduledTime; }

    public String getFollowUpSubject() { return followUpSubject; }
    public void setFollowUpSubject(String followUpSubject) { this.followUpSubject = followUpSubject; }

    public String getFollowUpNotes() { return followUpNotes; }
    public void setFollowUpNotes(String followUpNotes) { this.followUpNotes = followUpNotes; }

    public List<String> getFollowUpTags() { return followUpTags; }
    public void setFollowUpTags(List<String> followUpTags) { this.followUpTags = followUpTags; }

    public String getFollowUpMembershipStatus() { return followUpMembershipStatus; }
    public void setFollowUpMembershipStatus(String followUpMembershipStatus) { this.followUpMembershipStatus = followUpMembershipStatus; }

    public String getFollowUpMembershipPlan() { return followUpMembershipPlan; }
    public void setFollowUpMembershipPlan(String followUpMembershipPlan) { this.followUpMembershipPlan = followUpMembershipPlan; }

    public String getFollowUpReason() { return followUpReason; }
    public void setFollowUpReason(String followUpReason) { this.followUpReason = followUpReason; }

    public Integer getFollowUpEstimatedDuration() { return followUpEstimatedDuration; }
    public void setFollowUpEstimatedDuration(Integer followUpEstimatedDuration) { this.followUpEstimatedDuration = followUpEstimatedDuration; }

    public String getFollowUpOutcome() { return followUpOutcome; }
    public void setFollowUpOutcome(String followUpOutcome) { this.followUpOutcome = followUpOutcome; }
}
