package com.company.project.dto;

import java.time.LocalDateTime;

public class CommunicationRecordDTO {

    private Long id;
    private String type;
    private LocalDateTime date;
    private String staffMember;
    private Integer duration;
    private String outcome;
    private String notes;
    private String nextAction;

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
