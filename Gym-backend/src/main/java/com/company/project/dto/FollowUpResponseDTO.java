package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;
import java.util.List;

public class FollowUpResponseDTO {

    private Long id;
    private String followUpId;
    private Long leadId;
    private String leadName;
    private String leadEmail;
    private String leadPhone;
    private String type;
    private String status;
    private String priority;
    private String assignedStaff;
    private LocalDateTime dueDate;
    private String scheduledTime;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime completedDate;
    private String subject;
    private String notes;
    private List<String> tags;
    private String membershipStatus;
    private String membershipPlan;
    private String followUpReason;
    private Integer estimatedDuration;
    private String outcome;
    private List<CommunicationRecordDTO> communicationHistory;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFollowUpId() { return followUpId; }
    public void setFollowUpId(String followUpId) { this.followUpId = followUpId; }

    public Long getLeadId() { return leadId; }
    public void setLeadId(Long leadId) { this.leadId = leadId; }

    public String getLeadName() { return leadName; }
    public void setLeadName(String leadName) { this.leadName = leadName; }

    public String getLeadEmail() { return leadEmail; }
    public void setLeadEmail(String leadEmail) { this.leadEmail = leadEmail; }

    public String getLeadPhone() { return leadPhone; }
    public void setLeadPhone(String leadPhone) { this.leadPhone = leadPhone; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getAssignedStaff() { return assignedStaff; }
    public void setAssignedStaff(String assignedStaff) { this.assignedStaff = assignedStaff; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public String getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(String scheduledTime) { this.scheduledTime = scheduledTime; }

    public LocalDateTime getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDateTime completedDate) { this.completedDate = completedDate; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public String getMembershipPlan() { return membershipPlan; }
    public void setMembershipPlan(String membershipPlan) { this.membershipPlan = membershipPlan; }

    public String getFollowUpReason() { return followUpReason; }
    public void setFollowUpReason(String followUpReason) { this.followUpReason = followUpReason; }

    public Integer getEstimatedDuration() { return estimatedDuration; }
    public void setEstimatedDuration(Integer estimatedDuration) { this.estimatedDuration = estimatedDuration; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public List<CommunicationRecordDTO> getCommunicationHistory() { return communicationHistory; }
    public void setCommunicationHistory(List<CommunicationRecordDTO> communicationHistory) { this.communicationHistory = communicationHistory; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
