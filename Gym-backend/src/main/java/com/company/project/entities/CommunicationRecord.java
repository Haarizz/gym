package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "communication_records")
public class CommunicationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follow_up_id", nullable = false)
    private FollowUp followUp;

    // call / email / sms / whatsapp / in_app / meeting / visit
    @Column(name = "type")
    private String type;

    @Column(name = "date")
    private LocalDateTime date;

    @Column(name = "staff_member")
    private String staffMember;

    // duration in minutes
    @Column(name = "duration")
    private Integer duration;

    // successful / no_response / callback_requested / not_interested / converted / rescheduled
    @Column(name = "outcome")
    private String outcome;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "next_action", columnDefinition = "TEXT")
    private String nextAction;

    public CommunicationRecord() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public FollowUp getFollowUp() { return followUp; }
    public void setFollowUp(FollowUp followUp) { this.followUp = followUp; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }

    public String getStaffMember() { return staffMember; }
    public void setStaffMember(String staffMember) { this.staffMember = staffMember; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getNextAction() { return nextAction; }
    public void setNextAction(String nextAction) { this.nextAction = nextAction; }
}
