package com.company.project.dto;

import java.time.LocalDate;
import java.util.List;

public class WastageReturnRequestDTO {

    private LocalDate date;
    private String type;
    private String associatedParty;
    private String partyType;
    private String reason;
    private String location;
    private String recordedBy;
    private String notes;
    private List<WastageReturnItemDTO> items;

    public WastageReturnRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getAssociatedParty() { return associatedParty; }
    public void setAssociatedParty(String associatedParty) { this.associatedParty = associatedParty; }

    public String getPartyType() { return partyType; }
    public void setPartyType(String partyType) { this.partyType = partyType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<WastageReturnItemDTO> getItems() { return items; }
    public void setItems(List<WastageReturnItemDTO> items) { this.items = items; }
}
