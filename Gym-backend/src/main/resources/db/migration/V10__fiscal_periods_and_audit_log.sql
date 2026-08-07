-- Foundational financial infrastructure (Phase 2): fiscal period locking and a
-- general audit trail for the financial module.
--
-- Previously nothing stopped a journal entry from posting to any date, including
-- a closed month or a prior year — reports took arbitrary from/to/asOf dates with
-- no period discipline behind them. And the only audit trail in the whole app was
-- RewardAuditLog, scoped just to referral rewards — there was no general "who
-- posted/reversed/deleted this voucher and when" record for JournalVoucher or any
-- auto-posted entry from FinancialEventService.
--
-- Seed data for fiscal_years/fiscal_periods is NOT duplicated here — unlike the
-- single-row account_heads seed in V9, generating a year's worth of monthly
-- periods is loop logic that belongs in FiscalYearService.ensureCalendarYearSeeded(),
-- called idempotently from DataInitializer on every boot (same pattern already
-- used for warehouses, product categories, suppliers, etc. in that file).

CREATE TABLE fiscal_years (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE TABLE fiscal_periods (
    id             BIGSERIAL PRIMARY KEY,
    fiscal_year_id BIGINT NOT NULL REFERENCES fiscal_years(id),
    name           VARCHAR(50) NOT NULL,
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

-- Backs FiscalPeriodService.assertPeriodOpen()'s posting-time date lookup.
CREATE INDEX idx_fiscal_periods_date_range ON fiscal_periods (start_date, end_date);
CREATE INDEX idx_fiscal_periods_year ON fiscal_periods (fiscal_year_id);

CREATE TABLE financial_audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    action       VARCHAR(20) NOT NULL,
    entity_type  VARCHAR(100) NOT NULL,
    entity_id    BIGINT NOT NULL,
    voucher_no   VARCHAR(50),
    module       VARCHAR(50),
    performed_by VARCHAR(255),
    ip_address   VARCHAR(64),
    summary      TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_audit_logs_entity ON financial_audit_logs (entity_type, entity_id);
CREATE INDEX idx_financial_audit_logs_created_at ON financial_audit_logs (created_at);
