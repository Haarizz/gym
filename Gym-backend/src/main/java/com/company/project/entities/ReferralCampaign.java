package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

// A time-boxed (or evergreen, if dates are null) marketing wrapper around one or
// more ReferralRewardRule rows. Rules optionally attach to a campaign to inherit
// its date window/status instead of carrying their own — so marketing can launch
// a new promo ("Double Rewards Weekend") by inserting a campaign + rule rows,
// with no schema change and no redesign of the reward engine.
@Entity
@Table(name = "referral_campaigns")
public class ReferralCampaign extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: CAMP-XXXXXXXXXX
    @Column(name = "campaign_id", unique = true)
    private String campaignId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // scheduled / active / paused / expired
    @Column(name = "status")
    private String status = "scheduled";

    // Default priority/stackable inherited by rules attached to this campaign that
    // don't set their own value (see ReferralRewardRule.priority/stackable).
    @Column(name = "priority")
    private Integer priority = 0;

    @Column(name = "stackable")
    private Boolean stackable = false;

    public ReferralCampaign() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public Boolean getStackable() { return stackable; }
    public void setStackable(Boolean stackable) { this.stackable = stackable; }
}
