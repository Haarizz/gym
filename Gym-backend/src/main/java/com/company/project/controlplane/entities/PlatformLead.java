package com.company.project.controlplane.entities;

import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A prospective gym that submitted the public "Request a demo" onboarding form
 * (business-onboarding-fullscreen.tsx) on the pricing page. Tracked through
 * LEAD -> PENDING_APPROVAL -> APPROVED by GYMBIOS_ADMIN; APPROVED means a real
 * gym now exists (see gymTenantId/gymSlug), created via the existing
 * POST /api/gyms flow — this entity does not itself provision anything.
 *
 * Lives in the control-plane DB alongside Tenant, not any tenant DB: these are
 * prospects for GymBios itself, unrelated to the per-tenant Lead entity (a
 * gym's own member-prospect CRM).
 */
@Entity
@Table(name = "platform_leads")
public class PlatformLead extends ControlPlaneAuditableEntity {

    public static final String STAGE_LEAD = "LEAD";
    public static final String STAGE_PENDING_APPROVAL = "PENDING_APPROVAL";
    public static final String STAGE_APPROVED = "APPROVED";
    public static final String STAGE_REJECTED = "REJECTED";
    public static final String STAGE_LOST = "LOST";

    public static final String LEAD_STATUS_NEW = "NEW";
    public static final String LEAD_STATUS_CONTACTED = "CONTACTED";
    public static final String LEAD_STATUS_FOLLOW_UP = "FOLLOW_UP";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String stage = STAGE_LEAD;

    @Column(name = "lead_status", nullable = false)
    private String leadStatus = LEAD_STATUS_NEW;

    @Column(name = "business_name", nullable = false)
    private String businessName;

    @Column(name = "plan_interest")
    private String planInterest;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "business_types")
    private List<String> businessTypes = new ArrayList<>();

    @Column(name = "years_in_business")
    private String yearsInBusiness;

    private String country;
    private String state;

    @Column(name = "city_area")
    private String cityArea;

    private String address;
    private String branches;

    @Column(name = "member_count")
    private String memberCount;

    @Column(name = "staff_count")
    private String staffCount;

    @Convert(converter = JsonStringListConverter.class)
    private List<String> services = new ArrayList<>();

    @Column(name = "current_software")
    private String currentSoftware;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "reasons_to_switch")
    private List<String> reasonsToSwitch = new ArrayList<>();

    @Convert(converter = JsonStringListConverter.class)
    private List<String> goals = new ArrayList<>();

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "contact_whatsapp")
    private String contactWhatsapp;

    private String notes;

    @Column(nullable = false)
    private String source = "Pricing page onboarding";

    @Column(name = "submitted_from_ip")
    private String submittedFromIp;

    @Column(name = "gym_tenant_id")
    private Long gymTenantId;

    @Column(name = "gym_slug")
    private String gymSlug;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @OneToMany(mappedBy = "platformLead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("dueDate ASC")
    private List<PlatformLeadFollowUp> followUps = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getLeadStatus() { return leadStatus; }
    public void setLeadStatus(String leadStatus) { this.leadStatus = leadStatus; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getPlanInterest() { return planInterest; }
    public void setPlanInterest(String planInterest) { this.planInterest = planInterest; }

    public List<String> getBusinessTypes() { return businessTypes; }
    public void setBusinessTypes(List<String> businessTypes) { this.businessTypes = businessTypes; }

    public String getYearsInBusiness() { return yearsInBusiness; }
    public void setYearsInBusiness(String yearsInBusiness) { this.yearsInBusiness = yearsInBusiness; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getCityArea() { return cityArea; }
    public void setCityArea(String cityArea) { this.cityArea = cityArea; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getBranches() { return branches; }
    public void setBranches(String branches) { this.branches = branches; }

    public String getMemberCount() { return memberCount; }
    public void setMemberCount(String memberCount) { this.memberCount = memberCount; }

    public String getStaffCount() { return staffCount; }
    public void setStaffCount(String staffCount) { this.staffCount = staffCount; }

    public List<String> getServices() { return services; }
    public void setServices(List<String> services) { this.services = services; }

    public String getCurrentSoftware() { return currentSoftware; }
    public void setCurrentSoftware(String currentSoftware) { this.currentSoftware = currentSoftware; }

    public List<String> getReasonsToSwitch() { return reasonsToSwitch; }
    public void setReasonsToSwitch(List<String> reasonsToSwitch) { this.reasonsToSwitch = reasonsToSwitch; }

    public List<String> getGoals() { return goals; }
    public void setGoals(List<String> goals) { this.goals = goals; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getContactWhatsapp() { return contactWhatsapp; }
    public void setContactWhatsapp(String contactWhatsapp) { this.contactWhatsapp = contactWhatsapp; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getSubmittedFromIp() { return submittedFromIp; }
    public void setSubmittedFromIp(String submittedFromIp) { this.submittedFromIp = submittedFromIp; }

    public Long getGymTenantId() { return gymTenantId; }
    public void setGymTenantId(Long gymTenantId) { this.gymTenantId = gymTenantId; }

    public String getGymSlug() { return gymSlug; }
    public void setGymSlug(String gymSlug) { this.gymSlug = gymSlug; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public List<PlatformLeadFollowUp> getFollowUps() { return followUps; }
    public void setFollowUps(List<PlatformLeadFollowUp> followUps) { this.followUps = followUps; }
}
