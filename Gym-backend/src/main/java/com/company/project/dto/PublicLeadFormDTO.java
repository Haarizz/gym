package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * What the unauthenticated /f/{formKey} page is allowed to see. Deliberately
 * excludes tenant slug, branch id, assigned staff and counters.
 */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PublicLeadFormDTO {

    private String gymName;
    private String branchName;
    private String branchPhone;
    private String headline;
    private String description;
    private String successMessage;
    private String privacyPolicyUrl;
    private boolean showEmail;
    private boolean requireEmail;
    private boolean showInterest;
    private List<String> interestOptions;

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

    public String getBranchPhone() { return branchPhone; }
    public void setBranchPhone(String branchPhone) { this.branchPhone = branchPhone; }

    public String getHeadline() { return headline; }
    public void setHeadline(String headline) { this.headline = headline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSuccessMessage() { return successMessage; }
    public void setSuccessMessage(String successMessage) { this.successMessage = successMessage; }

    public String getPrivacyPolicyUrl() { return privacyPolicyUrl; }
    public void setPrivacyPolicyUrl(String privacyPolicyUrl) { this.privacyPolicyUrl = privacyPolicyUrl; }

    public boolean isShowEmail() { return showEmail; }
    public void setShowEmail(boolean showEmail) { this.showEmail = showEmail; }

    public boolean isRequireEmail() { return requireEmail; }
    public void setRequireEmail(boolean requireEmail) { this.requireEmail = requireEmail; }

    public boolean isShowInterest() { return showInterest; }
    public void setShowInterest(boolean showInterest) { this.showInterest = showInterest; }

    public List<String> getInterestOptions() { return interestOptions; }
    public void setInterestOptions(List<String> interestOptions) { this.interestOptions = interestOptions; }
}
