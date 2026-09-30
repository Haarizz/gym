package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/** Admin create/update body for /api/lead-forms. */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class LeadCaptureFormRequestDTO {

    private String name;
    // Only honoured in All Branches mode; otherwise the active branch is used.
    private Long branchId;
    private String headline;
    private String description;
    private String successMessage;
    private String privacyPolicyUrl;
    private String source;
    private String assignedStaff;
    private Boolean showEmail;
    private Boolean requireEmail;
    private Boolean showInterest;
    private Boolean active;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getHeadline() { return headline; }
    public void setHeadline(String headline) { this.headline = headline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSuccessMessage() { return successMessage; }
    public void setSuccessMessage(String successMessage) { this.successMessage = successMessage; }

    public String getPrivacyPolicyUrl() { return privacyPolicyUrl; }
    public void setPrivacyPolicyUrl(String privacyPolicyUrl) { this.privacyPolicyUrl = privacyPolicyUrl; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getAssignedStaff() { return assignedStaff; }
    public void setAssignedStaff(String assignedStaff) { this.assignedStaff = assignedStaff; }

    public Boolean getShowEmail() { return showEmail; }
    public void setShowEmail(Boolean showEmail) { this.showEmail = showEmail; }

    public Boolean getRequireEmail() { return requireEmail; }
    public void setRequireEmail(Boolean requireEmail) { this.requireEmail = requireEmail; }

    public Boolean getShowInterest() { return showInterest; }
    public void setShowInterest(Boolean showInterest) { this.showInterest = showInterest; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
