-- Provider identity -> user join table. provider_user_id (the provider's `sub`
-- claim) is the ONLY join key ever used to resolve an existing account — see
-- MobileSocialAuthService. email_at_link_time is informational/debugging only,
-- never read back for identity decisions.
CREATE TABLE IF NOT EXISTS user_identity_providers (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    provider            VARCHAR(20) NOT NULL,
    provider_user_id    VARCHAR(255) NOT NULL,
    email_at_link_time  VARCHAR(255),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identity_providers_provider_subject
    ON user_identity_providers (provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_providers_user_id
    ON user_identity_providers (user_id);

-- Pending social registration: a brand-new provider identity with no matching
-- user_identity_providers row and no email collision, waiting on the mobile
-- client to submit a username. Modeled on mobile_pending_registrations (V51):
-- hashed-token pattern, 24h expiry, PENDING/CONSUMED status, linked_user_id on
-- completion. One row per (provider, provider_user_id) — a retry upserts this
-- same row (new token minted, claims refreshed) rather than duplicating it;
-- this is also what lets an Apple retry with no email claim recover the
-- previously-captured email/verification flags from this same row.
CREATE TABLE IF NOT EXISTS mobile_pending_social_registrations (
    id                      BIGSERIAL PRIMARY KEY,
    pending_token_hash      VARCHAR(64) NOT NULL,
    provider                VARCHAR(20) NOT NULL,
    provider_user_id        VARCHAR(255) NOT NULL,
    email_at_provider       VARCHAR(255),
    email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    is_private_relay        BOOLEAN,
    full_name_at_provider   VARCHAR(255),
    suggested_username      VARCHAR(255),
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    linked_user_id          BIGINT,
    consumed_at             TIMESTAMP,
    expires_at              TIMESTAMP NOT NULL,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_pending_social_reg_token_hash
    ON mobile_pending_social_registrations (pending_token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_pending_social_reg_provider_subject
    ON mobile_pending_social_registrations (provider, provider_user_id);
