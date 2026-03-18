package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "referrals")
public class Referral extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business ID: REF-XXXXXXXXXX
    @Column(name = "referral_id", unique = true)
    private String referralId;

    // Who referred (member's memberId e.g. MBR-0000000001)
    @Column(name = "referrer_member_id")
    private String referrerMemberId;

    @Column(name = "referrer_name")
    private String referrerName;

    // The person being referred (not yet a member)
    @Column(name = "referee_name")
    private String refereeName;

    @Column(name = "referee_email")
    private String refereeEmail;

    @Column(name = "referee_phone")
    private String refereePhone;

    // Unique referral code used by the referee to sign up
    @Column(name = "referral_code", unique = true)
    private String referralCode;

    // pending / successful / expired
    @Column(name = "status")
    private String status;

    @Column(name = "reward_amount", precision = 10, scale = 2)
    private BigDecimal rewardAmount;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "signup_date")
    private LocalDate signupDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Which rule was applied (FK-like to ReferralRewardRule id)
    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "rule_name")
    private String ruleName;

    public Referral() {}

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
}
