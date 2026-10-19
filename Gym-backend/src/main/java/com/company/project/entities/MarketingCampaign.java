package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A social-media / ads campaign (V101): runs for a few days with a budget, is linked to the
 * lead forms its ads point to, and is credited with every lead those forms bring in, so the
 * gym can see spend and team hours against leads, conversions and revenue.
 * Not to be confused with {@link ReferralCampaign} (referral reward windows).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "marketing_campaigns")
public class MarketingCampaign extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: MKT-XXXXXXXXXX
    @Column(name = "campaign_code", unique = true, length = 30)
    private String campaignCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // instagram / facebook / meta / google / youtube / whatsapp / offline / other
    @Column(nullable = false, length = 30)
    private String platform = "instagram";

    // leads / trials / awareness / renewals / event
    @Column(nullable = false, length = 30)
    private String objective = "leads";

    // draft / active / paused / completed / cancelled
    @Column(nullable = false, length = 20)
    private String status = "draft";

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(name = "target_leads")
    private Integer targetLeads;

    @Column(name = "target_conversions")
    private Integer targetConversions;

    // Matched case-insensitively against utm_campaign on lead-form links.
    @Column(name = "tracking_code", length = 100)
    private String trackingCode;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "branch_id")
    private Long branchId;

    public MarketingCampaign() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCampaignCode() { return campaignCode; }
    public void setCampaignCode(String campaignCode) { this.campaignCode = campaignCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getObjective() { return objective; }
    public void setObjective(String objective) { this.objective = objective; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public Integer getTargetLeads() { return targetLeads; }
    public void setTargetLeads(Integer targetLeads) { this.targetLeads = targetLeads; }

    public Integer getTargetConversions() { return targetConversions; }
    public void setTargetConversions(Integer targetConversions) { this.targetConversions = targetConversions; }

    public String getTrackingCode() { return trackingCode; }
    public void setTrackingCode(String trackingCode) { this.trackingCode = trackingCode; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
