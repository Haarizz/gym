package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

// One row per branch holding the Referrals page's Settings tab configuration
// — each branch can run its own referral program/rules. Was a single global
// singleton (fixed id=1) before branch-scoping.
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "referral_settings")
public class ReferralSettings extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @Column(name = "program_enabled")
    private Boolean programEnabled = true;

    @Column(name = "auto_generate_codes")
    private Boolean autoGenerateCodes = true;

    @Column(name = "email_notifications")
    private Boolean emailNotifications = true;

    @Column(name = "auto_process_rewards")
    private Boolean autoProcessRewards = false;

    @Column(name = "code_prefix")
    private String codePrefix = "GYM";

    @Column(name = "link_domain")
    private String linkDomain = "gymbios.app/ref";

    @Column(name = "max_rewards_per_member")
    private Integer maxRewardsPerMember;

    @Column(name = "expiry_days")
    private Integer expiryDays = 90;

    @Column(name = "min_purchase_amount", precision = 10, scale = 2)
    private BigDecimal minPurchaseAmount;

    public ReferralSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Boolean getProgramEnabled() { return programEnabled; }
    public void setProgramEnabled(Boolean programEnabled) { this.programEnabled = programEnabled; }

    public Boolean getAutoGenerateCodes() { return autoGenerateCodes; }
    public void setAutoGenerateCodes(Boolean autoGenerateCodes) { this.autoGenerateCodes = autoGenerateCodes; }

    public Boolean getEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }

    public Boolean getAutoProcessRewards() { return autoProcessRewards; }
    public void setAutoProcessRewards(Boolean autoProcessRewards) { this.autoProcessRewards = autoProcessRewards; }

    public String getCodePrefix() { return codePrefix; }
    public void setCodePrefix(String codePrefix) { this.codePrefix = codePrefix; }

    public String getLinkDomain() { return linkDomain; }
    public void setLinkDomain(String linkDomain) { this.linkDomain = linkDomain; }

    public Integer getMaxRewardsPerMember() { return maxRewardsPerMember; }
    public void setMaxRewardsPerMember(Integer maxRewardsPerMember) { this.maxRewardsPerMember = maxRewardsPerMember; }

    public Integer getExpiryDays() { return expiryDays; }
    public void setExpiryDays(Integer expiryDays) { this.expiryDays = expiryDays; }

    public BigDecimal getMinPurchaseAmount() { return minPurchaseAmount; }
    public void setMinPurchaseAmount(BigDecimal minPurchaseAmount) { this.minPurchaseAmount = minPurchaseAmount; }
}
