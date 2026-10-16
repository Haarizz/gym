package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "mobile_referral_profiles")
public class MobileReferralProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Set for app-registered (global) members only; a gym-created login has none.
    @Column(name = "global_user_id", unique = true)
    private Long globalUserId;

    // The owner: the referrer's members row in this gym (unique index in V95).
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "referral_code", nullable = false, unique = true, length = 16)
    private String referralCode;

    public MobileReferralProfile() {}

    public MobileReferralProfile(Long globalUserId, String referralCode) {
        this.globalUserId = globalUserId;
        this.referralCode = referralCode;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGlobalUserId() { return globalUserId; }
    public void setGlobalUserId(Long globalUserId) { this.globalUserId = globalUserId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }
}
