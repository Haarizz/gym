-- V66__membership_freezes.sql
-- Additive only: one row per membership freeze, so the plan's freeze policy
-- (total days, number of freezes, free days, charge per extra day) can be
-- enforced across freezes instead of per request.

CREATE TABLE IF NOT EXISTS membership_freezes (
    id BIGSERIAL PRIMARY KEY,
    member_db_id BIGINT NOT NULL,
    plan_name VARCHAR(255),
    freeze_start TIMESTAMP NOT NULL,
    planned_end TIMESTAMP,
    ended_at TIMESTAMP,
    requested_days INTEGER NOT NULL DEFAULT 0,
    free_days_applied INTEGER NOT NULL DEFAULT 0,
    charged_days INTEGER NOT NULL DEFAULT 0,
    charge_per_day NUMERIC(10, 2),
    charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    charge_receipt_id BIGINT,
    reason TEXT,
    source VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_membership_freezes_member_start
    ON membership_freezes(member_db_id, freeze_start);
