package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class LeadRequestDTO {

    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String status;
    private String source;
    private String priority;
    private String assignedStaff;
    private LocalDateTime nextFollowUp;
    private LocalDateTime lastContactDate;
    private Integer interestLevel;
    private String notes;
    private List<String> tags;
    private String membershipInterest;
    private BigDecimal budget;
    private String preferredContactMethod;
    private Integer leadScore;

    // Getters & Setters

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getAssignedStaff() { return assignedStaff; }
    public void setAssignedStaff(String assignedStaff) { this.assignedStaff = assignedStaff; }

    public LocalDateTime getNextFollowUp() { return nextFollowUp; }
    public void setNextFollowUp(LocalDateTime nextFollowUp) { this.nextFollowUp = nextFollowUp; }

    public LocalDateTime getLastContactDate() { return lastContactDate; }
    public void setLastContactDate(LocalDateTime lastContactDate) { this.lastContactDate = lastContactDate; }

    public Integer getInterestLevel() { return interestLevel; }
    public void setInterestLevel(Integer interestLevel) { this.interestLevel = interestLevel; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getMembershipInterest() { return membershipInterest; }
    public void setMembershipInterest(String membershipInterest) { this.membershipInterest = membershipInterest; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public String getPreferredContactMethod() { return preferredContactMethod; }
    public void setPreferredContactMethod(String preferredContactMethod) { this.preferredContactMethod = preferredContactMethod; }

    public Integer getLeadScore() { return leadScore; }
    public void setLeadScore(Integer leadScore) { this.leadScore = leadScore; }
}
