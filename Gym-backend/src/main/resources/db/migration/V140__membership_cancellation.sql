-- Members › Cancel membership. A cancelled member is archived, never deleted: the row and
-- every bill, refund and ledger line stay, status becomes 'cancelled', and the gym drops
-- out of the member's app (global_user_id is cleared; the old link is kept here so a
-- rejoin can see who it was).

ALTER TABLE members ADD COLUMN IF NOT EXISTS cancelled_at             TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancelled_by             VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_reason      VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_notes       TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancelled_global_user_id BIGINT;

-- "On hold": the member asked to leave but still owes money. The membership is suspended
-- (no entry, no bookings) until the dues are paid or written off; then the cancellation
-- finishes — by itself when no refund was asked for.
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_hold_at     TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_hold_by     VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_hold_refund BOOLEAN NOT NULL DEFAULT FALSE;

-- One row per cancellation (a family head's row covers the whole household).
CREATE TABLE IF NOT EXISTS member_cancellations (
    id               BIGSERIAL PRIMARY KEY,
    branch_id        BIGINT,
    member_db_id     BIGINT       NOT NULL,
    member_code      VARCHAR(100),
    member_name      VARCHAR(255),
    household_ids    TEXT,                          -- comma-separated member ids cancelled with it
    household_size   INTEGER      NOT NULL DEFAULT 1,
    with_refund      BOOLEAN      NOT NULL DEFAULT FALSE,
    refund_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    policy_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    policy_method    VARCHAR(20),
    refund_voucher_nos TEXT,
    dues_action      VARCHAR(20),                   -- WRITE_OFF | DEDUCT | null (no dues)
    dues_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expiry_dues_cancelled NUMERIC(12, 2) NOT NULL DEFAULT 0,
    revenue_kept     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reason           VARCHAR(255),
    notes            TEXT,
    cancelled_by     VARCHAR(255),
    cancelled_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_member_cancellations_member ON member_cancellations (member_db_id);
CREATE INDEX IF NOT EXISTS idx_member_cancellations_at ON member_cancellations (cancelled_at);

-- The GymOS Member Deactivation Policy now drives cancellations. "Flat" refunds what is
-- left on current and future bills less this fixed fee.
INSERT INTO gymos_settings (category, setting_key, setting_value, created_at)
SELECT 'DEACTIVATION_POLICY', 'cancellation_fee', '0', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM gymos_settings WHERE category = 'DEACTIVATION_POLICY' AND setting_key = 'cancellation_fee'
);
