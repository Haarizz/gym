-- Mobile Referral Profile
CREATE TABLE mobile_referral_profiles (
    id BIGSERIAL PRIMARY KEY,
    global_user_id BIGINT NOT NULL,
    referral_code VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (global_user_id)
);

-- Mobile Referral Attribution
CREATE TABLE mobile_referral_attributions (
    id BIGSERIAL PRIMARY KEY,
    referrer_global_user_id BIGINT NOT NULL,
    referee_global_user_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL, -- PENDING, SUCCESSFUL, INVALID, EXPIRED
    legacy_referral_id BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (referee_global_user_id)
);

CREATE INDEX idx_mobile_ref_attr_referrer ON mobile_referral_attributions(referrer_global_user_id);
CREATE INDEX idx_mobile_ref_attr_status ON mobile_referral_attributions(status);
