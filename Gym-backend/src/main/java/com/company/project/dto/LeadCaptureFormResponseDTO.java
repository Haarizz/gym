package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDateTime;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class LeadCaptureFormResponseDTO {

    private Long id;
    private String formKey;
    private String name;
    private Long branchId;
    private String branchName;
    private String headline;
    private String description;
    private String successMessage;
    private String privacyPolicyUrl;
    private String source;
    private String assignedStaff;
    private boolean showEmail;
    private boolean requireEmail;
    private boolean showInterest;
    private boolean active;
    private long submissionCount;
    private LocalDateTime lastSubmissionAt;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }

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

    public boolean isShowEmail() { return showEmail; }
    public void setShowEmail(boolean showEmail) { this.showEmail = showEmail; }

    public boolean isRequireEmail() { return requireEmail; }
    public void setRequireEmail(boolean requireEmail) { this.requireEmail = requireEmail; }

    public boolean isShowInterest() { return showInterest; }
    public void setShowInterest(boolean showInterest) { this.showInterest = showInterest; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public long getSubmissionCount() { return submissionCount; }
    public void setSubmissionCount(long submissionCount) { this.submissionCount = submissionCount; }

    public LocalDateTime getLastSubmissionAt() { return lastSubmissionAt; }
    public void setLastSubmissionAt(LocalDateTime lastSubmissionAt) { this.lastSubmissionAt = lastSubmissionAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
