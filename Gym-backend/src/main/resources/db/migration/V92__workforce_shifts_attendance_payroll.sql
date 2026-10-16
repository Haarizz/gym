-- V92__workforce_shifts_attendance_payroll.sql
-- Workforce module: shift templates and rosters, shift-based staff attendance (daily
-- reviews + correction requests), advances & other payroll deductions, saved payroll
-- runs, and the monthly commission approve -> paid workflow. Also the extended HR
-- profile captured by the full-page Add/Edit Employee form.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_json TEXT;

-- Shift templates. A shift whose check_out is not after check_in runs past midnight.
CREATE TABLE IF NOT EXISTS shifts (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(120) NOT NULL,
    code               VARCHAR(12),
    shift_type         VARCHAR(20)  NOT NULL DEFAULT 'fixed',
    status             VARCHAR(20)  NOT NULL DEFAULT 'active',
    check_in           TIME         NOT NULL,
    check_out          TIME         NOT NULL,
    break_start        TIME,
    break_end          TIME,
    grace_in_minutes   INT          NOT NULL DEFAULT 10,
    grace_out_minutes  INT          NOT NULL DEFAULT 15,
    ot_after_minutes   INT          NOT NULL DEFAULT 15,
    max_daily_ot_hours NUMERIC(5, 2),
    max_weekly_hours   NUMERIC(5, 2),
    -- eligible = OT counts automatically, approval = only after a manager approves, none = never
    overtime_policy    VARCHAR(20)  NOT NULL DEFAULT 'approval',
    work_days          VARCHAR(40)  NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    departments        TEXT,
    effective_from     DATE,
    effective_to       DATE,
    branch_id          BIGINT,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_shifts_branch ON shifts (branch_id);

-- Which shift an employee works from a date (open-ended when effective_to is NULL).
CREATE TABLE IF NOT EXISTS shift_assignments (
    id             BIGSERIAL PRIMARY KEY,
    staff_id       BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    shift_id       BIGINT NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
    effective_from DATE   NOT NULL,
    effective_to   DATE,
    branch_id      BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_staff ON shift_assignments (staff_id, effective_from);

-- One-day roster changes from the weekly roster grid. shift_id NULL = day off.
CREATE TABLE IF NOT EXISTS shift_roster_days (
    id         BIGSERIAL PRIMARY KEY,
    staff_id   BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    work_date  DATE   NOT NULL,
    shift_id   BIGINT REFERENCES shifts (id) ON DELETE CASCADE,
    branch_id  BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT uq_shift_roster_day UNIQUE (staff_id, work_date)
);

-- Manager decisions on a staff member's day: a status override (leave, holiday...) and
-- overtime approval. Everything else about the day is computed from shifts + clock-ins.
CREATE TABLE IF NOT EXISTS staff_attendance_days (
    id                  BIGSERIAL PRIMARY KEY,
    staff_id            BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    work_date           DATE   NOT NULL,
    day_status          VARCHAR(30),
    approval_status     VARCHAR(20),
    approved_ot_minutes INT,
    note                TEXT,
    reviewed_by         VARCHAR(255),
    reviewed_at         TIMESTAMP,
    branch_id           BIGINT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255),
    CONSTRAINT uq_staff_attendance_day UNIQUE (staff_id, work_date)
);

-- Correction / manual-entry requests; applied to the clock-ins only once approved.
CREATE TABLE IF NOT EXISTS staff_attendance_corrections (
    id          BIGSERIAL PRIMARY KEY,
    staff_id    BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    work_date   DATE   NOT NULL,
    check_in    TIME,
    check_out   TIME,
    day_status  VARCHAR(30),
    reason      TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
    review_note TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    branch_id   BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_staff_att_corrections_status ON staff_attendance_corrections (status, work_date);

-- Configurable payroll deduction types (gym-wide).
CREATE TABLE IF NOT EXISTS deduction_types (
    id                BIGSERIAL PRIMARY KEY,
    name              VARCHAR(120) NOT NULL,
    code              VARCHAR(12)  NOT NULL,
    calc_method       VARCHAR(20)  NOT NULL DEFAULT 'Fixed',
    recurring         BOOLEAN      NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN      NOT NULL DEFAULT TRUE,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

INSERT INTO deduction_types (name, code, calc_method, recurring, requires_approval, active)
SELECT v.name, v.code, v.calc_method, v.recurring, v.requires_approval, TRUE
FROM (VALUES
    ('Unpaid Leave Deduction',     'ULD', 'Per Day',    FALSE, TRUE),
    ('Late Attendance Deduction',  'LAD', 'Fixed',      FALSE, FALSE),
    ('Early Departure Deduction',  'EDD', 'Per Hour',   FALSE, FALSE),
    ('Insurance Contribution',     'INS', 'Percentage', TRUE,  FALSE),
    ('Employee Loan Repayment',    'ELR', 'Fixed',      TRUE,  TRUE),
    ('Other Authorized Deduction', 'OAD', 'Fixed',      FALSE, TRUE)
) AS v (name, code, calc_method, recurring, requires_approval)
WHERE NOT EXISTS (SELECT 1 FROM deduction_types);

-- Deductions charged to an employee's payroll. amount is per month: Fixed = that amount,
-- Percentage = % of basic salary, Per Day / Per Hour = amount x quantity.
CREATE TABLE IF NOT EXISTS employee_deductions (
    id                     BIGSERIAL PRIMARY KEY,
    staff_id               BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    type_id                BIGINT NOT NULL REFERENCES deduction_types (id),
    amount                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quantity               NUMERIC(8, 2)  NOT NULL DEFAULT 1,
    frequency              VARCHAR(20)    NOT NULL DEFAULT 'One-Time',
    installments           INT            NOT NULL DEFAULT 1,
    completed_installments INT            NOT NULL DEFAULT 0,
    start_month            DATE           NOT NULL,
    reason                 TEXT,
    status                 VARCHAR(20)    NOT NULL DEFAULT 'Pending',
    approved_by            VARCHAR(255),
    approved_at            TIMESTAMP,
    branch_id              BIGINT,
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP,
    created_by             VARCHAR(255),
    updated_by             VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_staff ON employee_deductions (staff_id, status);

-- Each processed or skipped advance installment.
CREATE TABLE IF NOT EXISTS advance_repayments (
    id               BIGSERIAL PRIMARY KEY,
    advance_id       BIGINT NOT NULL REFERENCES salary_advances (id) ON DELETE CASCADE,
    installment_no   INT,
    period_month     DATE   NOT NULL,
    scheduled_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_before   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_after    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status           VARCHAR(20)    NOT NULL DEFAULT 'Processed',
    source           VARCHAR(20)    NOT NULL DEFAULT 'manual',
    payroll_run_id   BIGINT,
    note             TEXT,
    branch_id        BIGINT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_advance_repayments_advance ON advance_repayments (advance_id, period_month);

-- Saved payroll runs: Draft -> Approved -> Disbursed.
CREATE TABLE IF NOT EXISTS payroll_runs (
    id               BIGSERIAL PRIMARY KEY,
    period_year      INT NOT NULL,
    period_month     INT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'Draft',
    employee_count   INT NOT NULL DEFAULT 0,
    total_gross      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_net        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes            TEXT,
    approved_by      VARCHAR(255),
    approved_at      TIMESTAMP,
    disbursed_by     VARCHAR(255),
    disbursed_at     TIMESTAMP,
    branch_id        BIGINT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs (period_year, period_month);

CREATE TABLE IF NOT EXISTS payroll_run_lines (
    id                   BIGSERIAL PRIMARY KEY,
    run_id               BIGINT NOT NULL REFERENCES payroll_runs (id) ON DELETE CASCADE,
    staff_id             BIGINT,
    employee_code        VARCHAR(60),
    employee_name        VARCHAR(255),
    designation          VARCHAR(255),
    department           VARCHAR(255),
    basic_salary         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowances           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    scheduled_days       NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    present_days         NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    absent_days          NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    paid_leave_days      NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    unpaid_leave_days    NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    late_count           INT            NOT NULL DEFAULT 0,
    scheduled_hours      NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    actual_hours         NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    regular_hours        NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    approved_ot_hours    NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    ot_pay               NUMERIC(12, 2) NOT NULL DEFAULT 0,
    commission           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    attendance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    advance_repayment    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    other_deductions     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_pay            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_pay              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    breakdown_json       TEXT,
    branch_id            BIGINT
);
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_run ON payroll_run_lines (run_id);

-- Commission decisions per staff member, month and category (memberships / pos).
-- No row = estimated (month still running) or pending (month closed, not reviewed).
CREATE TABLE IF NOT EXISTS commission_earnings (
    id             BIGSERIAL PRIMARY KEY,
    staff_id       BIGINT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    period_year    INT NOT NULL,
    period_month   INT NOT NULL,
    category       VARCHAR(30) NOT NULL,
    amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status         VARCHAR(20) NOT NULL DEFAULT 'approved',
    note           TEXT,
    reviewed_by    VARCHAR(255),
    reviewed_at    TIMESTAMP,
    paid_at        TIMESTAMP,
    payroll_run_id BIGINT,
    branch_id      BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255),
    CONSTRAINT uq_commission_earning UNIQUE (staff_id, period_year, period_month, category)
);
