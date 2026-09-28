-- V57__add_mobile_idempotency_and_invitations.sql

-- 1. Create idempotency records table
CREATE TABLE IF NOT EXISTS mobile_idempotency_records (
    idempotency_key UUID PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    request_fingerprint VARCHAR(255) NOT NULL,
    response_payload TEXT,
    lease_id UUID,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- 2. Create family invitations table
CREATE TABLE IF NOT EXISTS mobile_family_invitations (
    id BIGSERIAL PRIMARY KEY,
    primary_member_id VARCHAR(255) NOT NULL,
    dependent_member_id VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL, -- PENDING, CLAIMED, REVOKED, EXPIRED
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_family_invitations_token ON mobile_family_invitations(token_hash);
CREATE INDEX idx_family_invitations_recipient ON mobile_family_invitations(recipient_email);

-- 3. Pre-flight check for duplicates before adding unique index
-- This block will fail the migration if duplicates exist, acting as an audit mechanism
DO $$
DECLARE
    duplicate_count INT;
BEGIN
    SELECT COUNT(*) INTO duplicate_count FROM (
        SELECT global_user_id
        FROM members
        WHERE global_user_id IS NOT NULL
        GROUP BY global_user_id
        HAVING count(*) > 1
    ) AS duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Audit Failed: Found % duplicate global_user_id(s). Explicit cleanup required before unique constraint can be applied.', duplicate_count;
    END IF;
END $$;

-- 4. Apply the strict UNIQUE constraint
CREATE UNIQUE INDEX idx_members_global_user_id_unique ON members(global_user_id) WHERE global_user_id IS NOT NULL;
