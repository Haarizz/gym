package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.time.LocalDateTime;

public class LeadInteractionDTO {

    private Long id;
    private String type;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime date;
    private String staffMember;
    private String notes;
    private String outcome;
    private Integer duration;

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
