-- Membership cancellation, round 2 (2026-11-13):
--  * The member keeps their GymBios app link when cancelled (the app shows the gym as
--    "Cancelled" and lets them read their history), so the saved copy of the link is dropped.
--  * GymOS › Member Deactivation Policy "Approval Required": a cancellation asked for by
--    staff who can't approve waits here until an Admin / Manager approves or rejects it.

ALTER TABLE members DROP COLUMN IF EXISTS cancelled_global_user_id;

CREATE TABLE IF NOT EXISTS member_cancellation_requests (
    id                BIGSERIAL PRIMARY KEY,
    branch_id         BIGINT,
    member_db_id      BIGINT        NOT NULL,
    member_code       VARCHAR(100),
    member_name       VARCHAR(255),
    household_size    INTEGER       NOT NULL DEFAULT 1,
    with_refund       BOOLEAN       NOT NULL DEFAULT FALSE,
    refund_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    policy_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    refund_method     VARCHAR(30),
    bank_account_code VARCHAR(50),
    bank_account_name VARCHAR(255),
    refund_reference  VARCHAR(120),
    refund_reason_code VARCHAR(40),
    dues_action       VARCHAR(20),
    dues_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reason            VARCHAR(255),
    notes             TEXT,
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
    requested_by      VARCHAR(255),
    requested_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    decided_by        VARCHAR(255),
    decided_at        TIMESTAMP,
    decision_note     TEXT,
    cancellation_id   BIGINT,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_member_cancellation_requests_status ON member_cancellation_requests (status, requested_at);
CREATE INDEX IF NOT EXISTS idx_member_cancellation_requests_member ON member_cancellation_requests (member_db_id);
