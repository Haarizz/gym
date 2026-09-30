-- V65__mobile_push_tokens_and_deliveries.sql
-- Additive only: push delivery for member mobile devices (outstanding-balance reminders).

-- 1. Expo push tokens registered by member devices
CREATE TABLE IF NOT EXISTS mobile_push_tokens (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_member ON mobile_push_tokens(member_id);

-- 2. One row per push actually sent — delivery_key makes each reminder send at most once
CREATE TABLE IF NOT EXISTS mobile_push_deliveries (
    id BIGSERIAL PRIMARY KEY,
    delivery_key VARCHAR(255) NOT NULL UNIQUE,
    member_id BIGINT NOT NULL,
    workflow_id BIGINT,
    sent_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mobile_push_deliveries_member ON mobile_push_deliveries(member_id);
