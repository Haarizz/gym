-- POS administration (BillBull parity):
--  * pos_cash_movement_categories — managed cash in / out categories (replacing the plain label
--    lists in pos_settings). A category may name a ledger account; a cash movement in such a
--    category is posted (DROP_IN: DR Cash in Hand / CR account, CASH_OUT: DR account / CR Cash).
--    Branches are seeded lazily from their pos_settings lists by the application.
--  * pos_corrections — maker-checker corrections of posted POS records: a sale's payment mode or
--    customer, a cash movement's category, a closed session's counted cash.
-- Idempotent.

CREATE TABLE IF NOT EXISTS pos_cash_movement_categories (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    -- DROP_IN, CASH_OUT or BOTH
    movement_type VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    account_code VARCHAR(30),
    account_name VARCHAR(150),
    display_order INTEGER NOT NULL DEFAULT 0,
    notes_required BOOLEAN NOT NULL DEFAULT FALSE,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_cash_categories_branch_code ON pos_cash_movement_categories (COALESCE(branch_id, 0), code);

DO $$
BEGIN
    IF to_regclass('public.cash_movements') IS NOT NULL THEN
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS category_id BIGINT;
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS posted_account_code VARCHAR(30);
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS posted_account_name VARCHAR(150);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pos_corrections (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    request_number VARCHAR(40),
    -- SALE, CASH_MOVEMENT, SESSION
    target_type VARCHAR(30) NOT NULL,
    target_id BIGINT NOT NULL,
    target_label VARCHAR(120),
    -- PAYMENT_MODE, CUSTOMER, CATEGORY, DENOMINATION
    correction_type VARCHAR(30) NOT NULL,
    original_json TEXT NOT NULL,
    corrected_json TEXT NOT NULL,
    difference_amount NUMERIC(12, 2),
    summary VARCHAR(500),
    reason VARCHAR(1000) NOT NULL,
    -- REQUESTED, PENDING_APPROVAL, APPROVED, APPLIED, REJECTED, CANCELLED, FAILED
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    requested_by VARCHAR(100),
    requested_at TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    approval_notes VARCHAR(1000),
    rejected_by VARCHAR(100),
    rejected_at TIMESTAMP,
    rejection_reason VARCHAR(1000),
    applied_by VARCHAR(100),
    applied_at TIMESTAMP,
    journal_reference VARCHAR(60),
    execution_error VARCHAR(1000),
    cancelled_by VARCHAR(100),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_corrections_status ON pos_corrections (status);
CREATE INDEX IF NOT EXISTS idx_pos_corrections_target ON pos_corrections (target_type, target_id);
