package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lead_interactions")
public class LeadInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    // call / email / meeting / whatsapp / sms / note
    @Column(name = "type")
    private String type;

    @Column(name = "date")
    private LocalDateTime date;

    @Column(name = "staff_member")
    private String staffMember;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // positive / neutral / negative
    @Column(name = "outcome")
    private String outcome;

    // duration in minutes (for calls/meetings)
    @Column(name = "duration")
    private Integer duration;

    public LeadInteraction() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Lead getLead() { return lead; }
    public void setLead(Lead lead) { this.lead = lead; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }

    public String getStaffMember() { return staffMember; }
    public void setStaffMember(String staffMember) { this.staffMember = staffMember; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
}
