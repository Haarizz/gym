package com.company.project.dto;

/**
 * Request body for freezing a member's membership.
 */
public class FreezeRequestDTO {

    private String freezeUntil;   // ISO date string "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ssZ"
    private String reason;

    public String getFreezeUntil() { return freezeUntil; }
    public void setFreezeUntil(String freezeUntil) { this.freezeUntil = freezeUntil; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
