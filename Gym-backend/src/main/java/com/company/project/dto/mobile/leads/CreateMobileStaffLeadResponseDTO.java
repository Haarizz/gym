package com.company.project.dto.mobile.leads;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class CreateMobileStaffLeadResponseDTO {

    private MobileCreatedLeadDTO lead;
    private MobileCreatedFollowUpDTO followUp;

    // Getters and Setters

    public MobileCreatedLeadDTO getLead() { return lead; }
    public void setLead(MobileCreatedLeadDTO lead) { this.lead = lead; }

    public MobileCreatedFollowUpDTO getFollowUp() { return followUp; }
    public void setFollowUp(MobileCreatedFollowUpDTO followUp) { this.followUp = followUp; }
}
