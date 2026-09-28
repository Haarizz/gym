package com.company.project.entities;

import jakarta.persistence.*;

/**
 * Links a Google/Apple provider identity (the provider's `sub` claim) to a
 * {@link User} row. `provider` + `providerUserId` is the only identity join
 * key ever used to resolve an existing account — never email, which is stored
 * here purely as display/support metadata (emailAtLinkTime).
 */
@Entity
@Table(name = "user_identity_providers")
public class UserIdentityProvider extends BaseEntity {

    public static final String PROVIDER_GOOGLE = "GOOGLE";
    public static final String PROVIDER_APPLE = "APPLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "provider", nullable = false)
    private String provider;

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    @Column(name = "email_at_link_time")
    private String emailAtLinkTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getProviderUserId() { return providerUserId; }
    public void setProviderUserId(String providerUserId) { this.providerUserId = providerUserId; }

    public String getEmailAtLinkTime() { return emailAtLinkTime; }
    public void setEmailAtLinkTime(String emailAtLinkTime) { this.emailAtLinkTime = emailAtLinkTime; }
}
