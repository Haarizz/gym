package com.company.project.dto.mobile.family;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Price quote for a Family/Couple plan, per family member in order (buyer
 * excluded): isMinor, and optionally their own plan id (null = the head's plan).
 */
public class MobileFamilyQuoteRequestDTO {

    @NotNull
    @JsonProperty("planId")
    private Long planId;

    @NotNull
    @JsonProperty("memberIsMinor")
    private List<Boolean> memberIsMinor;

    // Same length as memberIsMinor when present; may be omitted or contain nulls.
    @JsonProperty("memberPlanIds")
    private List<Long> memberPlanIds;

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public List<Boolean> getMemberIsMinor() { return memberIsMinor; }
    public void setMemberIsMinor(List<Boolean> memberIsMinor) { this.memberIsMinor = memberIsMinor; }

    public List<Long> getMemberPlanIds() { return memberPlanIds; }
    public void setMemberPlanIds(List<Long> memberPlanIds) { this.memberPlanIds = memberPlanIds; }
}
