package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "mobile_referral_profiles")
public class MobileReferralProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "global_user_id", nullable = false, unique = true)
    private Long globalUserId;

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

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }
}
