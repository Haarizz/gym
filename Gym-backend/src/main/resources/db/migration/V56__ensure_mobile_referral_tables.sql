-- V42.1/V43 create mobile_referral_profiles/mobile_referral_attributions and their
-- audit columns, but some tenants already had these exact tables from an earlier
-- Hibernate ddl-auto=update bootstrap pass at provisioning time, with no Flyway
-- history row recording it (confirmed live: emma, emma_1, kerala-gym all failed
-- catch-up migration here with "relation already exists" once outOfOrder(true) let
-- V42.1 run for them). V42.1/V43 themselves are left untouched — editing an
-- already-applied migration's content changes its checksum and breaks Flyway
-- validation for every tenant that already ran it successfully (e.g. power-gym).
-- This is a new, idempotent migration instead, safe to run on every tenant
-- regardless of which of the two prior paths it went through.
CREATE TABLE IF NOT EXISTS mobile_referral_profiles (
    id BIGSERIAL PRIMARY KEY,
    global_user_id BIGINT NOT NULL,
    referral_code VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (global_user_id)
);

CREATE TABLE IF NOT EXISTS mobile_referral_attributions (
    id BIGSERIAL PRIMARY KEY,
    referrer_global_user_id BIGINT NOT NULL,
    referee_global_user_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL, -- PENDING, SUCCESSFUL, INVALID, EXPIRED
    legacy_referral_id BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (referee_global_user_id)
);

ALTER TABLE mobile_referral_profiles ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE mobile_referral_profiles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE mobile_referral_attributions ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE mobile_referral_attributions ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_mobile_ref_attr_referrer ON mobile_referral_attributions(referrer_global_user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_ref_attr_status ON mobile_referral_attributions(status);
