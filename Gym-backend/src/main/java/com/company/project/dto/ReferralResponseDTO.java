package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReferralResponseDTO {

    private Long id;
    private String referralId;
    private String referrerMemberId;
    private String referrerName;
    private String refereeName;
    private String refereeEmail;
    private String refereePhone;
    private String referralCode;
    private String referralLink;
    private String status;
    private BigDecimal rewardAmount;
    private LocalDate date;
    private LocalDate signupDate;
    private LocalDate paymentDate;
    private String notes;
    private Long ruleId;
    private String ruleName;
    private Boolean rewardRedeemed;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    // Getters & Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReferralId() { return referralId; }
    public void setReferralId(String referralId) { this.referralId = referralId; }

    public String getReferrerMemberId() { return referrerMemberId; }
    public void setReferrerMemberId(String referrerMemberId) { this.referrerMemberId = referrerMemberId; }

    public String getReferrerName() { return referrerName; }
    public void setReferrerName(String referrerName) { this.referrerName = referrerName; }

    public String getRefereeName() { return refereeName; }
    public void setRefereeName(String refereeName) { this.refereeName = refereeName; }

    public String getRefereeEmail() { return refereeEmail; }
    public void setRefereeEmail(String refereeEmail) { this.refereeEmail = refereeEmail; }

    public String getRefereePhone() { return refereePhone; }
    public void setRefereePhone(String refereePhone) { this.refereePhone = refereePhone; }

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }

    public String getReferralLink() { return referralLink; }
    public void setReferralLink(String referralLink) { this.referralLink = referralLink; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getRewardAmount() { return rewardAmount; }
    public void setRewardAmount(BigDecimal rewardAmount) { this.rewardAmount = rewardAmount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalDate getSignupDate() { return signupDate; }
    public void setSignupDate(LocalDate signupDate) { this.signupDate = signupDate; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public Boolean getRewardRedeemed() { return rewardRedeemed; }
    public void setRewardRedeemed(Boolean rewardRedeemed) { this.rewardRedeemed = rewardRedeemed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
