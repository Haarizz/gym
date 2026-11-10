package com.company.project.dto;

/** POST /api/billing/pending-payments/{receiptId}/write-off */
public class WriteOffRequestDTO {

    /** UNCOLLECTABLE | DISCONTINUED | MANAGEMENT_DECISION | OLD_BALANCE | OTHER */
    private String reason;
    private String notes;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
