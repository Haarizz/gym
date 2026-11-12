-- Training packages (docs/training-packages-commission-plan.md).
--
-- 1. training_packages: PT packages admins sell — session-based (N sessions within D days) or
--    day-based (D days, optionally capped at N sessions) — with when the trainer's commission
--    counts (on enrolment or as the package is used) and two admin policies.
-- 2. package_enrolments: one member's purchase. It is sold through the add-on flow, so the
--    payment, receipt, wallet, approval and refund all live on its member_addons row.
-- 3. package_trainer_changes: who the trainer was from when, so earned shares stay put.
-- 4. bookings.enrolment_id: the package a PT booking used.
-- 5. performance_events.part: lets one source row hold several credits for the same metric and
--    person (a day-based package earns a separate share in every month it covers).

-- ── 1. Packages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_packages (
    id                 BIGSERIAL PRIMARY KEY,
    branch_id          BIGINT,
    name               VARCHAR(255) NOT NULL,
    description        TEXT,
    kind               VARCHAR(10)  NOT NULL DEFAULT 'pt',          -- pt (class later)
    plan_type          VARCHAR(10)  NOT NULL,                       -- sessions | days
    session_count      INT,                                         -- required for 'sessions'
    session_cap        INT,                                         -- optional for 'days'
    validity_days      INT          NOT NULL,
    price              NUMERIC(10, 2) NOT NULL,
    default_trainer_id BIGINT,
    commission_timing  VARCHAR(12)  NOT NULL DEFAULT 'enrolment',   -- enrolment | completion
    unused_at_expiry   VARCHAR(15)  NOT NULL DEFAULT 'forfeit',     -- forfeit | pay_at_expiry
    no_show_policy     VARCHAR(12)  NOT NULL DEFAULT 'counts',      -- counts | not_counted
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_training_packages_branch ON training_packages (branch_id);

-- ── 2. Enrolments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_enrolments (
    id                BIGSERIAL PRIMARY KEY,
    branch_id         BIGINT,
    package_id        BIGINT       NOT NULL REFERENCES training_packages (id),
    member_id         BIGINT       NOT NULL,
    member_addon_id   BIGINT,                                       -- the sale (payment, receipt, refund)
    trainer_id        BIGINT,                                       -- current trainer
    package_name      VARCHAR(255) NOT NULL,
    plan_type         VARCHAR(10)  NOT NULL,
    sessions_total    INT,                                          -- NULL = unlimited
    validity_days     INT          NOT NULL,
    start_date        DATE         NOT NULL,
    end_date          DATE         NOT NULL,                        -- start + validity - 1
    price             NUMERIC(10, 2) NOT NULL,
    commission_timing VARCHAR(12)  NOT NULL,
    unused_at_expiry  VARCHAR(15)  NOT NULL,
    no_show_policy    VARCHAR(12)  NOT NULL,
    status            VARCHAR(12)  NOT NULL DEFAULT 'active',       -- active | cancelled
    cancelled_at      TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_package_enrolments_member ON package_enrolments (member_id);
CREATE INDEX IF NOT EXISTS idx_package_enrolments_addon ON package_enrolments (member_addon_id);
CREATE INDEX IF NOT EXISTS idx_package_enrolments_trainer ON package_enrolments (trainer_id);

-- ── 3. Trainer changes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_trainer_changes (
    id              BIGSERIAL PRIMARY KEY,
    enrolment_id    BIGINT    NOT NULL REFERENCES package_enrolments (id) ON DELETE CASCADE,
    from_trainer_id BIGINT,
    to_trainer_id   BIGINT,
    effective_date  DATE      NOT NULL,                             -- the new trainer's first day
    changed_by      VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_package_trainer_changes_enrolment ON package_trainer_changes (enrolment_id);

-- ── 4. Bookings ─────────────────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS enrolment_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_bookings_enrolment ON bookings (enrolment_id);

-- ── 5. Ledger parts ─────────────────────────────────────────────────────────
ALTER TABLE performance_events ADD COLUMN IF NOT EXISTS part VARCHAR(40) NOT NULL DEFAULT '';
DROP INDEX IF EXISTS uq_performance_events_source;
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_events_source
    ON performance_events (source_type, source_id, metric, COALESCE(staff_id, 0), part, revision);
