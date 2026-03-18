package com.company.project.entities;

import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "follow_ups")
public class FollowUp extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: FU-XXXXXXXXXX
    @Column(name = "follow_up_id", unique = true)
    private String followUpId;

    // Optionally link to a member (memberId e.g. MBR-0000000001) or lead
    @Column(name = "member_id")
    private String memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "member_email")
    private String memberEmail;

    @Column(name = "member_phone")
    private String memberPhone;

    // call / email / sms / whatsapp / in_app / meeting / visit
    @Column(name = "type")
    private String type;

    // pending / completed / overdue / cancelled / rescheduled
    @Column(name = "status")
    private String status;

    // high / medium / low
    @Column(name = "priority")
    private String priority;

    @Column(name = "assigned_staff")
    private String assignedStaff;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "scheduled_time")
    private String scheduledTime;

    @Column(name = "completed_date")
    private LocalDateTime completedDate;

    @Column(name = "subject")
    private String subject;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tags", columnDefinition = "TEXT")
    @Convert(converter = JsonStringListConverter.class)
    private List<String> tags = new ArrayList<>();

    // active / pending / expired / frozen / cancelled
    @Column(name = "membership_status")
    private String membershipStatus;

    @Column(name = "membership_plan")
    private String membershipPlan;

    @Column(name = "follow_up_reason")
    private String followUpReason;

    // estimated duration in minutes
    @Column(name = "estimated_duration")
    private Integer estimatedDuration;

    // successful / no_response / callback_requested / not_interested / converted / rescheduled
    @Column(name = "outcome")
    private String outcome;

    @OneToMany(mappedBy = "followUp", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<CommunicationRecord> communicationHistory = new ArrayList<>();

    public FollowUp() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFollowUpId() { return followUpId; }
    public void setFollowUpId(String followUpId) { this.followUpId = followUpId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberEmail() { return memberEmail; }
    public void setMemberEmail(String memberEmail) { this.memberEmail = memberEmail; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

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

    public List<CommunicationRecord> getCommunicationHistory() { return communicationHistory; }
    public void setCommunicationHistory(List<CommunicationRecord> communicationHistory) { this.communicationHistory = communicationHistory; }
}
