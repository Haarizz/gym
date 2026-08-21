package com.company.project.dto.mobile.membership;

import com.fasterxml.jackson.annotation.JsonProperty;

public class MobileMemberFreezeRequestDTO {
    @JsonProperty("duration_days")
    private Integer durationDays;
    private String reason;

    public Integer getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
