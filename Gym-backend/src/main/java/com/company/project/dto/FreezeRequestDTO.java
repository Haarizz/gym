package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/**
 * Request body for freezing a member's membership.
 * Uses camelCase (overrides the global SNAKE_CASE Jackson strategy) because
 * the frontend freeze-unfreeze page sends camelCase JSON (freezeUntil,
 * freezeStartDate) — without this, those two fields silently deserialize to
 * null (freeze_until/freeze_start_date never arrive), while reason still
 * works since it's a single word identical in both namings.
 */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class FreezeRequestDTO {

    private String freezeUntil;   // ISO date string "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ssZ"
    private String freezeStartDate; // Same formats; optional — defaults to now when omitted
    private String reason;
    private boolean overrideLimits; // a manager going past the plan's freeze limits
    private boolean waiveCharge;    // don't bill the days beyond the free allowance

    public String getFreezeUntil() { return freezeUntil; }
    public void setFreezeUntil(String freezeUntil) { this.freezeUntil = freezeUntil; }

    public String getFreezeStartDate() { return freezeStartDate; }
    public void setFreezeStartDate(String freezeStartDate) { this.freezeStartDate = freezeStartDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public boolean isOverrideLimits() { return overrideLimits; }
    public void setOverrideLimits(boolean overrideLimits) { this.overrideLimits = overrideLimits; }

    public boolean isWaiveCharge() { return waiveCharge; }
    public void setWaiveCharge(boolean waiveCharge) { this.waiveCharge = waiveCharge; }
}
