package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * A gym's public lead form (see V6__lead_capture_forms.sql). Control-plane, not
 * tenant, so an unauthenticated submission can resolve formKey -> tenant + branch
 * before any tenant DataSource is picked.
 */
@Entity
@Table(name = "lead_capture_forms")
public class LeadCaptureForm extends ControlPlaneAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_key", nullable = false, unique = true)
    private String formKey;

    @Column(name = "tenant_slug", nullable = false)
    private String tenantSlug;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(nullable = false)
    private String name;

    private String headline;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "success_message", columnDefinition = "TEXT")
    private String successMessage;

    @Column(name = "privacy_policy_url", length = 500)
    private String privacyPolicyUrl;

    @Column(nullable = false)
    private String source = "social-media";

    @Column(name = "assigned_staff")
    private String assignedStaff;

    @Column(name = "show_email", nullable = false)
    private boolean showEmail = true;

    @Column(name = "require_email", nullable = false)
    private boolean requireEmail = false;

    @Column(name = "show_interest", nullable = false)
    private boolean showInterest = true;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "submission_count", nullable = false)
    private long submissionCount = 0;

    @Column(name = "last_submission_at")
    private LocalDateTime lastSubmissionAt;

    public LeadCaptureForm() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFormKey() { return formKey; }
    public void setFormKey(String formKey) { this.formKey = formKey; }

    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String tenantSlug) { this.tenantSlug = tenantSlug; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

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
}
