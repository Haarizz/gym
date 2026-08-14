package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ReferralRequestDTO {

    private String referrerMemberId;
    private String referrerName;
    private String refereeName;
    private String refereeEmail;
    private String refereePhone;
    private String refereePhoto;
    private String status;
    private BigDecimal rewardAmount;
    private LocalDate date;
    private LocalDate visitDate;
    private LocalDate signupDate;
    private LocalDate paymentDate;
    private String notes;
    private Long ruleId;
    private String referralCode;

    // Getters & Setters

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

    public String getRefereePhoto() { return refereePhoto; }
    public void setRefereePhoto(String refereePhoto) { this.refereePhoto = refereePhoto; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getRewardAmount() { return rewardAmount; }
    public void setRewardAmount(BigDecimal rewardAmount) { this.rewardAmount = rewardAmount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }

    public LocalDate getSignupDate() { return signupDate; }
    public void setSignupDate(LocalDate signupDate) { this.signupDate = signupDate; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }
}
