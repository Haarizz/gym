package com.company.project.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One cost entry on a {@link MarketingCampaign}: money spent and/or team hours put in. */
@Entity
@Table(name = "marketing_campaign_spends")
public class MarketingCampaignSpend extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "spend_date", nullable = false)
    private LocalDate spendDate;

    // ad_spend / creative / boosting / influencer / printing / team_time / other
    @Column(nullable = false, length = 30)
    private String category = "ad_spend";

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal hours = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public MarketingCampaignSpend() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public LocalDate getSpendDate() { return spendDate; }
    public void setSpendDate(LocalDate spendDate) { this.spendDate = spendDate; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getHours() { return hours; }
    public void setHours(BigDecimal hours) { this.hours = hours; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
