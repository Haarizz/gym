CREATE TABLE mobile_pending_registrations (
    id                      BIGSERIAL PRIMARY KEY,
    registration_token_hash VARCHAR(64) NOT NULL,
    email_normalized        VARCHAR(255) NOT NULL,
    username_normalized     VARCHAR(255) NOT NULL,
    full_name               VARCHAR(255) NOT NULL,
    username                VARCHAR(255) NOT NULL,
    email                   VARCHAR(255) NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    otp_hash                VARCHAR(255),
    otp_expires_at          TIMESTAMP NOT NULL,
    otp_attempt_count       INTEGER NOT NULL DEFAULT 0,
    total_attempt_count     INTEGER NOT NULL DEFAULT 0,
    resend_count            INTEGER NOT NULL DEFAULT 0,
    last_otp_sent_at        TIMESTAMP,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    linked_user_id          BIGINT,
    consumed_at             TIMESTAMP,
    expires_at              TIMESTAMP NOT NULL,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255)
);

-- Plain, unconditional unique indexes: one pending row per normalized email and
-- one per normalized username, regardless of status. "Re-registration" and
-- "reclaim" are implemented as updates/deletes against the existing row rather
-- than a second insert — see MobilePendingRegistrationService.
CREATE UNIQUE INDEX idx_mobile_pending_registrations_email ON mobile_pending_registrations (email_normalized);
CREATE UNIQUE INDEX idx_mobile_pending_registrations_username ON mobile_pending_registrations (username_normalized);
CREATE UNIQUE INDEX idx_mobile_pending_registrations_token_hash ON mobile_pending_registrations (registration_token_hash);
