package com.company.project.dto;

import java.math.BigDecimal;

public class ReferralSettingsDTO {

    private Boolean programEnabled;
    private Boolean autoGenerateCodes;
    private Boolean emailNotifications;
    private Boolean autoProcessRewards;
    private String codePrefix;
    private String linkDomain;
    private Integer maxRewardsPerMember;
    private Integer expiryDays;
    private BigDecimal minPurchaseAmount;

    public ReferralSettingsDTO() {}

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

    public static ReferralSettingsDTO fromEntity(com.company.project.entities.ReferralSettings s) {
        ReferralSettingsDTO dto = new ReferralSettingsDTO();
        dto.setProgramEnabled(s.getProgramEnabled());
        dto.setAutoGenerateCodes(s.getAutoGenerateCodes());
        dto.setEmailNotifications(s.getEmailNotifications());
        dto.setAutoProcessRewards(s.getAutoProcessRewards());
        dto.setCodePrefix(s.getCodePrefix());
        dto.setLinkDomain(s.getLinkDomain());
        dto.setMaxRewardsPerMember(s.getMaxRewardsPerMember());
        dto.setExpiryDays(s.getExpiryDays());
        dto.setMinPurchaseAmount(s.getMinPurchaseAmount());
        return dto;
    }
}
