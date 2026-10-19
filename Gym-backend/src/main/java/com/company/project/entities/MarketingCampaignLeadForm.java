package com.company.project.entities;

import jakarta.persistence.*;

/**
 * Links a {@link MarketingCampaign} to a public lead form. leadFormId is a control-plane
 * lead_capture_forms.id (a different database), so it is a plain column, not a relation.
 */
@Entity
@Table(name = "marketing_campaign_lead_forms",
        uniqueConstraints = @UniqueConstraint(name = "uq_marketing_campaign_lead_form",
                columnNames = {"campaign_id", "lead_form_id"}))
public class MarketingCampaignLeadForm extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "lead_form_id", nullable = false)
    private Long leadFormId;

    public MarketingCampaignLeadForm() {}

    public MarketingCampaignLeadForm(Long campaignId, Long leadFormId) {
        this.campaignId = campaignId;
        this.leadFormId = leadFormId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public Long getLeadFormId() { return leadFormId; }
    public void setLeadFormId(Long leadFormId) { this.leadFormId = leadFormId; }
}
