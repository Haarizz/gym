package com.company.project.entities;

import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "leads")
public class Lead extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: LEAD-XXXXXXXXXX
    @Column(name = "lead_id", unique = true)
    private String leadId;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    // new / contacted / follow_up / converted / lost
    @Column(name = "status")
    private String status;

    // website / referral / walk_in / social_media / google_ads / facebook_ads / instagram / other
    @Column(name = "source")
    private String source;

    // high / medium / low
    @Column(name = "priority")
    private String priority;

    // Staff member name or ID assigned to this lead
    @Column(name = "assigned_staff")
    private String assignedStaff;

    @Column(name = "next_follow_up")
    private LocalDateTime nextFollowUp;

    @Column(name = "last_contact_date")
    private LocalDateTime lastContactDate;

    // 1–10 scale
    @Column(name = "interest_level")
    private Integer interestLevel;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "tags", columnDefinition = "TEXT")
    @Convert(converter = JsonStringListConverter.class)
    private List<String> tags = new ArrayList<>();

    @Column(name = "membership_interest")
    private String membershipInterest;

    @Column(name = "budget", precision = 10, scale = 2)
    private BigDecimal budget;

    // email / phone / whatsapp / sms
    @Column(name = "preferred_contact_method")
    private String preferredContactMethod;

    // 0–100 calculated or manually set score
    @Column(name = "lead_score")
    private Integer leadScore;

    @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<LeadInteraction> interactions = new ArrayList<>();

    @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FollowUp> followUps = new ArrayList<>();

    public Lead() {}

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLeadId() { return leadId; }
    public void setLeadId(String leadId) { this.leadId = leadId; }

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

    public List<LeadInteraction> getInteractions() { return interactions; }
    public void setInteractions(List<LeadInteraction> interactions) { this.interactions = interactions; }

    public List<FollowUp> getFollowUps() { return followUps; }
    public void setFollowUps(List<FollowUp> followUps) { this.followUps = followUps; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
