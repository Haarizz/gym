package com.company.project.dto;

import java.time.LocalDate;

/**
 * Returned by GET /api/checkin/status so devices with screens can show
 * member feedback before/after a check-in.
 */
public class CheckInStatusResponse {

    private String memberName;
    private String membershipStatus;   // active | expired | suspended | inactive
    private LocalDate expires;
    private long todayVisits;
    private String message;            // Human-readable display text for the device screen
    private boolean allowed;           // Whether the member can enter right now

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMembershipStatus() { return membershipStatus; }
    public void setMembershipStatus(String membershipStatus) { this.membershipStatus = membershipStatus; }

    public LocalDate getExpires() { return expires; }
    public void setExpires(LocalDate expires) { this.expires = expires; }

    public long getTodayVisits() { return todayVisits; }
    public void setTodayVisits(long todayVisits) { this.todayVisits = todayVisits; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isAllowed() { return allowed; }
    public void setAllowed(boolean allowed) { this.allowed = allowed; }
}
