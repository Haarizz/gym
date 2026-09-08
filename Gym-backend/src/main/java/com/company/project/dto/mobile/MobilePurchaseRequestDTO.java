package com.company.project.dto.mobile;

import com.fasterxml.jackson.annotation.JsonProperty;

public class MobilePurchaseRequestDTO {
    @JsonProperty("planId")
    private Long planId;

    public Long getPlanId() {
        return planId;
    }

    public void setPlanId(Long planId) {
        this.planId = planId;
    }
}
