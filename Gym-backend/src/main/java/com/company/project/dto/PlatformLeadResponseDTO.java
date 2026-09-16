package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PlatformLeadResponseDTO {

    private Long id;
    private String stage;
    private String leadStatus;
    private String businessName;
    private String planInterest;
    private List<String> businessTypes;
    private String yearsInBusiness;
    private String country;
    private String state;
    private String cityArea;
    private String address;
    private String branches;
    private String memberCount;
    private String staffCount;
    private List<String> services;
    private String currentSoftware;
    private List<String> reasonsToSwitch;
    private List<String> goals;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String contactWhatsapp;
    private String notes;
    private String source;
    private Long gymTenantId;
    private String gymSlug;
    private LocalDateTime approvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PlatformLeadFollowUpResponseDTO> followUps;

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

    public Long getGymTenantId() { return gymTenantId; }
    public void setGymTenantId(Long gymTenantId) { this.gymTenantId = gymTenantId; }

    public String getGymSlug() { return gymSlug; }
    public void setGymSlug(String gymSlug) { this.gymSlug = gymSlug; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PlatformLeadFollowUpResponseDTO> getFollowUps() { return followUps; }
    public void setFollowUps(List<PlatformLeadFollowUpResponseDTO> followUps) { this.followUps = followUps; }
}
