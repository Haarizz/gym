package com.company.project.dto;

public class PlatformLeadFollowUpRequestDTO {

    private String type;
    private String dueDate; // ISO-8601, parsed in the service
    private String notes;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
