-- Deferred revenue recognition for multi-month memberships.
--
-- Previously, FinancialEventService.onMemberPaymentReceived() recognized 100% of
-- every membership payment as revenue immediately, even for a 12-month plan paid
-- upfront. The "2300 Deferred Revenue" account already existed in account_heads
-- but nothing ever posted to it. These two tables back the new amortization
-- schedule: one row per qualifying receipt (deferred_revenue_schedules) and one
-- row per monthly recognition bucket (deferred_revenue_recognition_lines), posted
-- by DeferredRevenueRecognitionScheduler as each bucket's period elapses.
--
-- Also bundled in this migration (small, related bug fixes):
--   - seeds account 5800 "Depreciation Expense", which FinancialEventService.
--     onAssetDepreciated() has always posted to by hardcoded account code, but
--     which was never actually present in the seeded chart of accounts.
--   - adds expenses.payment_status so onExpenseApproved() can credit Accounts
--     Payable instead of always assuming immediate cash payment.

CREATE TABLE deferred_revenue_schedules (
    id                         BIGSERIAL PRIMARY KEY,
    receipt_id                 BIGINT NOT NULL,
    member_db_id               BIGINT,
    member_name                VARCHAR(255),
    plan_name                  VARCHAR(255),
    total_amount               NUMERIC(12,2) NOT NULL,
    recognized_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_amount           NUMERIC(12,2) NOT NULL,
    start_date                 DATE NOT NULL,
    end_date                   DATE NOT NULL,
    total_periods              INTEGER NOT NULL,
    status                     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    source_journal_voucher_id  BIGINT NOT NULL,
    created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMP,
    created_by                 VARCHAR(255),
    updated_by                 VARCHAR(255)
);

CREATE INDEX idx_deferred_revenue_schedules_status ON deferred_revenue_schedules (status);
CREATE INDEX idx_deferred_revenue_schedules_receipt ON deferred_revenue_schedules (receipt_id);

CREATE TABLE deferred_revenue_recognition_lines (
    id                             BIGSERIAL PRIMARY KEY,
    schedule_id                    BIGINT NOT NULL REFERENCES deferred_revenue_schedules(id),
    period_number                  INTEGER NOT NULL,
    period_start                   DATE NOT NULL,
    period_end                     DATE NOT NULL,
    amount                         NUMERIC(12,2) NOT NULL,
    status                         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    recognized_journal_voucher_id  BIGINT,
    recognized_at                  TIMESTAMP,
    created_at                     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                     TIMESTAMP,
    created_by                     VARCHAR(255),
    updated_by                     VARCHAR(255)
);

-- Backs DeferredRevenueScheduleService.findDuePeriods()'s monthly scheduler query.
CREATE INDEX idx_deferred_revenue_lines_due ON deferred_revenue_recognition_lines (status, period_end);
CREATE INDEX idx_deferred_revenue_lines_schedule ON deferred_revenue_recognition_lines (schedule_id);

ALTER TABLE expenses ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID';

INSERT INTO account_heads (code, name, type, opening_balance, current_balance, is_active, created_at)
VALUES ('5800', 'Depreciation Expense', 'EXPENSE', 0, 0, TRUE, NOW())
ON CONFLICT (code) DO NOTHING;
