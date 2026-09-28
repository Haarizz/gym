package com.company.project.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * A verified-provider-identity registration with no matching {@link
 * UserIdentityProvider} row yet and no email collision — waiting on the
 * mobile client to submit a username. One row per (provider, providerUserId):
 * a retry upserts this same row (new token, refreshed claims/expiry) rather
 * than duplicating it, which is also what lets an Apple retry with no email
 * claim recover the previously-captured email from this same row. No {@link
 * User} row exists for this registration until {@code /complete} succeeds —
 * mirrors {@link MobilePendingRegistration}'s security boundary.
 */
@Entity
@Table(name = "mobile_pending_social_registrations")
public class MobilePendingSocialRegistration extends BaseEntity {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_CONSUMED = "CONSUMED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pending_token_hash", nullable = false, unique = true)
    private String pendingTokenHash;

    @Column(name = "provider", nullable = false)
    private String provider;

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    @Column(name = "email_at_provider")
    private String emailAtProvider;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "is_private_relay")
    private Boolean isPrivateRelay;

    @Column(name = "full_name_at_provider")
    private String fullNameAtProvider;

    @Column(name = "suggested_username")
    private String suggestedUsername;

    @Column(name = "status", nullable = false)
    private String status = STATUS_PENDING;

    @Column(name = "linked_user_id")
    private Long linkedUserId;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPendingTokenHash() { return pendingTokenHash; }
    public void setPendingTokenHash(String pendingTokenHash) { this.pendingTokenHash = pendingTokenHash; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getProviderUserId() { return providerUserId; }
    public void setProviderUserId(String providerUserId) { this.providerUserId = providerUserId; }

    public String getEmailAtProvider() { return emailAtProvider; }
    public void setEmailAtProvider(String emailAtProvider) { this.emailAtProvider = emailAtProvider; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public Boolean getIsPrivateRelay() { return isPrivateRelay; }
    public void setIsPrivateRelay(Boolean isPrivateRelay) { this.isPrivateRelay = isPrivateRelay; }

    public String getFullNameAtProvider() { return fullNameAtProvider; }
    public void setFullNameAtProvider(String fullNameAtProvider) { this.fullNameAtProvider = fullNameAtProvider; }

    public String getSuggestedUsername() { return suggestedUsername; }
    public void setSuggestedUsername(String suggestedUsername) { this.suggestedUsername = suggestedUsername; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getLinkedUserId() { return linkedUserId; }
    public void setLinkedUserId(Long linkedUserId) { this.linkedUserId = linkedUserId; }

    public LocalDateTime getConsumedAt() { return consumedAt; }
    public void setConsumedAt(LocalDateTime consumedAt) { this.consumedAt = consumedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
