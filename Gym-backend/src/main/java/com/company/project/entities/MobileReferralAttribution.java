package com.company.project.entities;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mobile_referral_attributions")
public class MobileReferralAttribution extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Set for app-registered (global) referrers only; a gym-created login has none.
    @Column(name = "referrer_global_user_id")
    private Long referrerGlobalUserId;

    // The referrer's members row in this gym — who the reward goes to.
    @Column(name = "referrer_member_id")
    private Long referrerMemberId;

    @Column(name = "referee_global_user_id", nullable = false, unique = true)
    private Long refereeGlobalUserId;

    @Column(name = "status", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private MobileReferralStatus status;

    @Column(name = "legacy_referral_id")
    private Long legacyReferralId;

    public MobileReferralAttribution() {}

    public MobileReferralAttribution(Long referrerMemberId, Long referrerGlobalUserId, Long refereeGlobalUserId,
                                     MobileReferralStatus status) {
        this.referrerMemberId = referrerMemberId;
        this.referrerGlobalUserId = referrerGlobalUserId;
        this.refereeGlobalUserId = refereeGlobalUserId;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @JsonProperty("referrerGlobalUserId")
    public Long getReferrerGlobalUserId() { return referrerGlobalUserId; }
    public void setReferrerGlobalUserId(Long referrerGlobalUserId) { this.referrerGlobalUserId = referrerGlobalUserId; }

    @JsonProperty("referrerMemberId")
    public Long getReferrerMemberId() { return referrerMemberId; }
    public void setReferrerMemberId(Long referrerMemberId) { this.referrerMemberId = referrerMemberId; }

    @JsonProperty("refereeGlobalUserId")
    public Long getRefereeGlobalUserId() { return refereeGlobalUserId; }
    public void setRefereeGlobalUserId(Long refereeGlobalUserId) { this.refereeGlobalUserId = refereeGlobalUserId; }

    public MobileReferralStatus getStatus() { return status; }
    public void setStatus(MobileReferralStatus status) { this.status = status; }

    @JsonProperty("legacyReferralId")
    public Long getLegacyReferralId() { return legacyReferralId; }
    public void setLegacyReferralId(Long legacyReferralId) { this.legacyReferralId = legacyReferralId; }

    // This entity is returned as-is by /api/mobile/referrals/history to a
    // camelCase mobile client, but the app's global
    // spring.jackson.property-naming-strategy=SNAKE_CASE rewrites bean property
    // names by default (e.g. createdAt -> created_at) — @JsonProperty pins the
    // wire format back to camelCase, same as the other fields above.
    @Override
    @JsonProperty("createdAt")
    public LocalDateTime getCreatedAt() { return super.getCreatedAt(); }
}
