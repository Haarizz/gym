-- Performance & Incentives Engine (docs/performance-incentives-engine-plan.md).
--
-- 1. Staff IDs on source rows (attribution by id instead of processedBy LIKE '%name%').
-- 2. performance_events: one row per credited activity (append-only; corrections are new rows).
-- 3. targets / target_lines replacing staff_targets + employees.monthly_target.
-- 4. incentive_plans (+ assignments, lines, bonuses) replacing commission_rules.
-- 5. commission_earnings: one settlement per staff member and month with a frozen breakdown.
--
-- First release counts the core metrics only: MEMBER_ADMISSION, LEAD_CONVERSION, POS_SALE,
-- PT_SESSION_DELIVERED, CLASS_TAUGHT, CLASS_ATTENDEE (+ the virtual REVENUE_TOTAL). Old
-- settings with no core metric (base_commission on renewals/add-ons/walk-ins/instalments,
-- PT revenue targets, renewal/add-on/walk-in/POS-item unit targets) are not carried over;
-- they are listed in performance_migration_report.
--
-- The old tables and columns stay until the clean-up release (plan §8 Phase 6).

-- ── 1. Attribution ──────────────────────────────────────────────────────────
ALTER TABLE receipts          ADD COLUMN IF NOT EXISTS processed_by_staff_id BIGINT;
ALTER TABLE leads             ADD COLUMN IF NOT EXISTS assigned_staff_id BIGINT;
ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS cashier_staff_id BIGINT;
ALTER TABLE follow_ups        ADD COLUMN IF NOT EXISTS assigned_staff_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_receipts_processed_by_staff ON receipts (processed_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_staff_id ON leads (assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_sale_transactions_cashier_staff ON sale_transactions (cashier_staff_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_staff_id ON follow_ups (assigned_staff_id);

-- Staff names that identify exactly one employee (case-insensitive, trimmed). A name shared
-- by two employees is never guessed; those rows stay unassigned for an admin to fix.
CREATE TEMP TABLE tmp_unique_staff_names AS
SELECT LOWER(TRIM(name)) AS key, MIN(id) AS staff_id
FROM employees
WHERE name IS NOT NULL AND TRIM(name) <> ''
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) = 1;

CREATE TEMP TABLE tmp_unique_staff_logins AS
SELECT app_username AS login, MIN(id) AS staff_id
FROM employees
WHERE app_username IS NOT NULL AND app_username <> ''
GROUP BY app_username
HAVING COUNT(*) = 1;

-- Receipts: the processed-by name is what the desk picked from the staff list, so an exact
-- name match comes first; otherwise the login that created the receipt.
UPDATE receipts r SET processed_by_staff_id = n.staff_id
FROM tmp_unique_staff_names n
WHERE r.processed_by_staff_id IS NULL AND LOWER(TRIM(r.processed_by)) = n.key;

UPDATE receipts r SET processed_by_staff_id = l.staff_id
FROM tmp_unique_staff_logins l
WHERE r.processed_by_staff_id IS NULL AND r.created_by = l.login
  AND COALESCE(r.processed_by, '') <> 'Mobile App';

-- Leads / follow-ups: the assignee's name; a lead with no assignee falls back to its creator.
UPDATE leads x SET assigned_staff_id = n.staff_id
FROM tmp_unique_staff_names n
WHERE x.assigned_staff_id IS NULL AND LOWER(TRIM(x.assigned_staff)) = n.key;

UPDATE leads x SET assigned_staff_id = l.staff_id
FROM tmp_unique_staff_logins l
WHERE x.assigned_staff_id IS NULL AND COALESCE(TRIM(x.assigned_staff), '') = '' AND x.created_by = l.login;

UPDATE follow_ups x SET assigned_staff_id = n.staff_id
FROM tmp_unique_staff_names n
WHERE x.assigned_staff_id IS NULL AND LOWER(TRIM(x.assigned_staff)) = n.key;

-- POS: the cashier's login, else the cashier name printed on the sale.
UPDATE sale_transactions s SET cashier_staff_id = l.staff_id
FROM tmp_unique_staff_logins l
WHERE s.cashier_staff_id IS NULL AND s.created_by = l.login;

UPDATE sale_transactions s SET cashier_staff_id = n.staff_id
FROM tmp_unique_staff_names n
WHERE s.cashier_staff_id IS NULL AND LOWER(TRIM(s.cashier_name)) = n.key;

-- ── 2. Activity ledger ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_events (
    id                BIGSERIAL PRIMARY KEY,
    branch_id         BIGINT,
    staff_id          BIGINT,                 -- NULL = nobody credited (still counts for branch targets)
    metric            VARCHAR(40) NOT NULL,
    occurred_at       TIMESTAMP NOT NULL,
    quantity          INT NOT NULL DEFAULT 0, -- can be negative on a reversal
    amount            NUMERIC(12, 2),         -- NULL for count-only metrics
    source_type       VARCHAR(20) NOT NULL,   -- receipt | sale | lead | session
    source_id         BIGINT NOT NULL,
    revision          INT NOT NULL DEFAULT 0, -- 0 = original credit, 1.. = corrections
    reverses_event_id BIGINT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_events_source
    ON performance_events (source_type, source_id, metric, COALESCE(staff_id, 0), revision);
CREATE INDEX IF NOT EXISTS idx_performance_events_staff_time ON performance_events (staff_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_performance_events_branch_time ON performance_events (branch_id, occurred_at);

-- One row per database: has the history been rebuilt into performance_events yet?
CREATE TABLE IF NOT EXISTS performance_engine_state (
    key        VARCHAR(60) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- What the migration could not carry over, for the admin to review.
CREATE TABLE IF NOT EXISTS performance_migration_report (
    id         BIGSERIAL PRIMARY KEY,
    kind       VARCHAR(60) NOT NULL,
    branch_id  BIGINT,
    ref_id     BIGINT,
    detail     TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO performance_migration_report (kind, branch_id, detail)
SELECT 'unassigned_receipts', branch_id, COUNT(*) || ' admission receipt(s) processed by a name with no unique staff member'
FROM receipts
WHERE processed_by_staff_id IS NULL AND transaction_type = 'New' AND COALESCE(processed_by, '') NOT IN ('Mobile App', 'Admin', '')
GROUP BY branch_id;

INSERT INTO performance_migration_report (kind, branch_id, detail)
SELECT 'unassigned_sales', branch_id, COUNT(*) || ' completed POS sale(s) with no matching cashier'
FROM sale_transactions WHERE cashier_staff_id IS NULL AND status = 'COMPLETED'
GROUP BY branch_id;

INSERT INTO performance_migration_report (kind, branch_id, detail)
SELECT 'unassigned_leads', branch_id, COUNT(*) || ' lead(s) assigned to a name with no unique staff member'
FROM leads WHERE assigned_staff_id IS NULL AND COALESCE(TRIM(assigned_staff), '') <> ''
GROUP BY branch_id;

-- ── 3. Targets ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS targets (
    id             BIGSERIAL PRIMARY KEY,
    branch_id      BIGINT,
    scope          VARCHAR(10) NOT NULL,     -- staff | role | branch
    staff_id       BIGINT,
    role           VARCHAR(100),
    period_type    VARCHAR(10) NOT NULL DEFAULT 'month',
    period_start   DATE NOT NULL,            -- first day of the month
    period_end     DATE NOT NULL,            -- last day of the month
    repeat_monthly BOOLEAN NOT NULL DEFAULT FALSE, -- also applies to later months with no target of their own
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_targets_scope_period
    ON targets (COALESCE(branch_id, 0), scope, COALESCE(staff_id, 0), COALESCE(LOWER(role), ''), period_start);
CREATE INDEX IF NOT EXISTS idx_targets_period ON targets (period_start);

CREATE TABLE IF NOT EXISTS target_lines (
    id        BIGSERIAL PRIMARY KEY,
    target_id BIGINT NOT NULL REFERENCES targets (id) ON DELETE CASCADE,
    metric    VARCHAR(40) NOT NULL,
    measure   VARCHAR(10) NOT NULL,          -- count | amount
    goal      NUMERIC(14, 2) NOT NULL,
    CONSTRAINT uq_target_line UNIQUE (target_id, metric, measure)
);

-- staff_targets -> targets. Monthly rows keep their month; quarterly/yearly/custom rows only
-- ever showed as their first month, so they become that month (and are reported).
CREATE TEMP TABLE tmp_target_map AS
SELECT st.id AS old_id,
       CASE WHEN st.staff_db_id IS NULL THEN 'branch' ELSE 'staff' END AS scope,
       st.staff_db_id AS staff_id,
       COALESCE(st.branch_id, e.branch_id) AS branch_id,
       COALESCE(
           CASE WHEN st.year IS NOT NULL AND st.month IS NOT NULL THEN make_date(st.year, st.month, 1) END,
           date_trunc('month', st.start_date)::date) AS period_start,
       st.created_at,
       ROW_NUMBER() OVER (
           PARTITION BY st.staff_db_id, COALESCE(st.branch_id, e.branch_id),
                        COALESCE(CASE WHEN st.year IS NOT NULL AND st.month IS NOT NULL THEN make_date(st.year, st.month, 1) END,
                                 date_trunc('month', st.start_date)::date)
           ORDER BY st.created_at DESC, st.id DESC) AS rn
FROM staff_targets st
LEFT JOIN employees e ON e.id = st.staff_db_id;

INSERT INTO performance_migration_report (kind, branch_id, ref_id, detail)
SELECT 'target_timeframe_converted', st.branch_id, st.id,
       'Target #' || st.id || ' (' || COALESCE(st.timeframe, '?') || ') converted to the month of ' || m.period_start
FROM staff_targets st JOIN tmp_target_map m ON m.old_id = st.id
WHERE COALESCE(LOWER(st.timeframe), 'monthly') <> 'monthly' AND m.period_start IS NOT NULL;

INSERT INTO performance_migration_report (kind, branch_id, ref_id, detail)
SELECT 'target_skipped', st.branch_id, st.id, 'Target #' || st.id || ' has no month or start date'
FROM staff_targets st JOIN tmp_target_map m ON m.old_id = st.id
WHERE m.period_start IS NULL;

INSERT INTO targets (branch_id, scope, staff_id, period_type, period_start, period_end, created_at)
SELECT m.branch_id, m.scope, m.staff_id, 'month', m.period_start,
       (m.period_start + INTERVAL '1 month' - INTERVAL '1 day')::date, m.created_at
FROM tmp_target_map m
WHERE m.rn = 1 AND m.period_start IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE tmp_target_new AS
SELECT m.old_id, t.id AS target_id
FROM tmp_target_map m
JOIN targets t ON t.period_start = m.period_start AND t.scope = m.scope
             AND COALESCE(t.staff_id, 0) = COALESCE(m.staff_id, 0)
             AND COALESCE(t.branch_id, 0) = COALESCE(m.branch_id, 0)
WHERE m.rn = 1 AND m.period_start IS NOT NULL;

INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT n.target_id, 'REVENUE_TOTAL', 'amount', st.revenue_target
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.revenue_target > 0 ON CONFLICT DO NOTHING;

-- "Membership revenue" now means admissions (the only membership metric in this release).
INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT n.target_id, 'MEMBER_ADMISSION', 'amount', st.membership_revenue_target
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.membership_revenue_target > 0 ON CONFLICT DO NOTHING;

INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT n.target_id, 'POS_SALE', 'amount', st.pos_revenue_target
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.pos_revenue_target > 0 ON CONFLICT DO NOTHING;

INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT n.target_id, 'LEAD_CONVERSION', 'count', st.new_clients_target
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.new_clients_target > 0 ON CONFLICT DO NOTHING;

INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT n.target_id, 'PT_SESSION_DELIVERED', 'count', st.sessions_target
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.sessions_target > 0 ON CONFLICT DO NOTHING;

INSERT INTO performance_migration_report (kind, branch_id, ref_id, detail)
SELECT 'target_line_dropped', st.branch_id, st.id, 'PT revenue target ' || st.pt_revenue_target || ' (no PT revenue metric yet)'
FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
WHERE st.pt_revenue_target > 0;

-- Unit targets: [{"service":"admissions","target_units":10}, ...]
DO $$
DECLARE
    rec RECORD;
    u   RECORD;
    metric_code TEXT;
BEGIN
    FOR rec IN
        SELECT n.target_id, st.id AS old_id, st.branch_id, st.unit_targets_json
        FROM tmp_target_new n JOIN staff_targets st ON st.id = n.old_id
        WHERE st.unit_targets_json IS NOT NULL AND st.unit_targets_json ~ '^\s*\['
    LOOP
        BEGIN
            FOR u IN
                SELECT e->>'service' AS service, (e->>'target_units')::numeric AS units
                FROM jsonb_array_elements(rec.unit_targets_json::jsonb) e
            LOOP
                IF u.units IS NULL OR u.units <= 0 THEN CONTINUE; END IF;
                metric_code := CASE u.service
                    WHEN 'admissions'  THEN 'MEMBER_ADMISSION'
                    WHEN 'pos_sales'   THEN 'POS_SALE'
                    WHEN 'pt_sessions' THEN 'PT_SESSION_DELIVERED'
                    ELSE NULL END;
                IF metric_code IS NULL THEN
                    INSERT INTO performance_migration_report (kind, branch_id, ref_id, detail)
                    VALUES ('target_line_dropped', rec.branch_id, rec.old_id,
                            'Unit target "' || COALESCE(u.service, '?') || '" = ' || u.units || ' (no matching metric yet)');
                ELSE
                    INSERT INTO target_lines (target_id, metric, measure, goal)
                    VALUES (rec.target_id, metric_code, 'count', u.units)
                    ON CONFLICT (target_id, metric, measure) DO UPDATE SET goal = target_lines.goal + EXCLUDED.goal;
                END IF;
            END LOOP;
        EXCEPTION WHEN others THEN
            INSERT INTO performance_migration_report (kind, branch_id, ref_id, detail)
            VALUES ('target_line_dropped', rec.branch_id, rec.old_id, 'Unreadable unit targets: ' || LEFT(rec.unit_targets_json, 200));
        END;
    END LOOP;
END $$;

-- employees.monthly_target was the standing revenue goal for any month without a target:
-- it becomes a repeating staff target from 2000-01, under any month-specific ones above.
INSERT INTO targets (branch_id, scope, staff_id, period_type, period_start, period_end, repeat_monthly)
SELECT e.branch_id, 'staff', e.id, 'month', DATE '2000-01-01', DATE '2000-01-31', TRUE
FROM employees e
WHERE e.monthly_target > 0
ON CONFLICT DO NOTHING;

INSERT INTO target_lines (target_id, metric, measure, goal)
SELECT t.id, 'REVENUE_TOTAL', 'amount', e.monthly_target
FROM employees e
JOIN targets t ON t.scope = 'staff' AND t.staff_id = e.id AND t.period_start = DATE '2000-01-01' AND t.repeat_monthly
WHERE e.monthly_target > 0
ON CONFLICT DO NOTHING;

-- ── 4. Incentive plans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incentive_plans (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    branch_id      BIGINT,                   -- NULL = all branches
    effective_from DATE NOT NULL,            -- first day of a month
    effective_to   DATE,
    status         VARCHAR(10) NOT NULL DEFAULT 'active', -- draft | active | archived
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS incentive_plan_assignments (
    id       BIGSERIAL PRIMARY KEY,
    plan_id  BIGINT NOT NULL REFERENCES incentive_plans (id) ON DELETE CASCADE,
    role     VARCHAR(100),
    staff_id BIGINT                          -- staff_id overrides role
);
CREATE INDEX IF NOT EXISTS idx_incentive_plan_assignments_plan ON incentive_plan_assignments (plan_id);

CREATE TABLE IF NOT EXISTS incentive_plan_lines (
    id         BIGSERIAL PRIMARY KEY,
    plan_id    BIGINT NOT NULL REFERENCES incentive_plans (id) ON DELETE CASCADE,
    metric     VARCHAR(40) NOT NULL,
    basis      VARCHAR(20) NOT NULL,         -- percent_of_amount | fixed_per_unit
    rate       NUMERIC(12, 2) NOT NULL,
    min_units  INT,
    cap_amount NUMERIC(12, 2)
);

CREATE TABLE IF NOT EXISTS incentive_plan_bonuses (
    id              BIGSERIAL PRIMARY KEY,
    plan_id         BIGINT NOT NULL REFERENCES incentive_plans (id) ON DELETE CASCADE,
    trigger_type    VARCHAR(30) NOT NULL DEFAULT 'target_attainment',
    metric          VARCHAR(40) NOT NULL,    -- a metric or REVENUE_TOTAL
    threshold_pct   NUMERIC(7, 2) NOT NULL,
    reward_type     VARCHAR(30) NOT NULL,    -- fixed | percent_of_metric_amount
    reward_value    NUMERIC(12, 2) NOT NULL,
    condition_metric VARCHAR(40),
    condition_min   NUMERIC(12, 2)
);

-- commission_rules -> one plan per role for all branches, effective from 2000-01-01.
DO $$
DECLARE
    rule RECORD;
    b    RECORD;
    pid  BIGINT;
    admission NUMERIC;
BEGIN
    IF to_regclass('commission_rules') IS NULL THEN RETURN; END IF;
    FOR rule IN SELECT * FROM commission_rules LOOP
        IF EXISTS (SELECT 1 FROM incentive_plans WHERE name = rule.role || ' commission' AND branch_id IS NULL) THEN
            CONTINUE;
        END IF;
        INSERT INTO incentive_plans (name, branch_id, effective_from, status)
        VALUES (rule.role || ' commission', NULL, DATE '2000-01-01', 'active')
        RETURNING id INTO pid;
        INSERT INTO incentive_plan_assignments (plan_id, role) VALUES (pid, rule.role);

        admission := COALESCE(rule.admission_commission, rule.base_commission);
        IF admission > 0 THEN
            INSERT INTO incentive_plan_lines (plan_id, metric, basis, rate)
            VALUES (pid, 'MEMBER_ADMISSION', 'percent_of_amount', admission);
        END IF;
        IF rule.pos_commission > 0 THEN
            INSERT INTO incentive_plan_lines (plan_id, metric, basis, rate)
            VALUES (pid, 'POS_SALE', 'percent_of_amount', rule.pos_commission);
        END IF;
        IF rule.pos_commission_per_sale > 0 THEN
            INSERT INTO incentive_plan_lines (plan_id, metric, basis, rate)
            VALUES (pid, 'POS_SALE', 'fixed_per_unit', rule.pos_commission_per_sale);
        END IF;
        IF rule.base_commission > 0 THEN
            INSERT INTO performance_migration_report (kind, ref_id, detail)
            VALUES ('plan_line_dropped', rule.id, 'Role "' || rule.role || '": base commission ' || rule.base_commission
                    || '% on renewals, add-ons, walk-ins and instalments (no matching metric yet)');
        END IF;

        BEGIN
            IF rule.target_bonuses_json IS NOT NULL AND rule.target_bonuses_json ~ '^\s*\[' THEN
                FOR b IN
                    SELECT (e->>'threshold')::numeric AS threshold, (e->>'bonus')::numeric AS bonus
                    FROM jsonb_array_elements(rule.target_bonuses_json::jsonb) e
                LOOP
                    IF b.threshold > 0 AND b.bonus > 0 THEN
                        INSERT INTO incentive_plan_bonuses (plan_id, trigger_type, metric, threshold_pct, reward_type, reward_value)
                        VALUES (pid, 'target_attainment', 'REVENUE_TOTAL', b.threshold, 'percent_of_metric_amount', b.bonus);
                    END IF;
                END LOOP;
            END IF;
        EXCEPTION WHEN others THEN
            INSERT INTO performance_migration_report (kind, ref_id, detail)
            VALUES ('plan_bonus_dropped', rule.id, 'Role "' || rule.role || '": unreadable target bonuses');
        END;
    END LOOP;
END $$;

-- ── 5. Settlements ──────────────────────────────────────────────────────────
ALTER TABLE commission_earnings ADD COLUMN IF NOT EXISTS breakdown_json TEXT;
ALTER TABLE commission_earnings ADD COLUMN IF NOT EXISTS plan_id BIGINT;
ALTER TABLE commission_earnings ADD COLUMN IF NOT EXISTS computed_amount NUMERIC(12, 2);
ALTER TABLE commission_earnings ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(12, 2);

-- memberships + pos rows -> one 'total' row per staff member and month, when both share a
-- status. A month with mixed statuses (e.g. one part already paid by payroll) keeps its old
-- rows so nothing is paid twice; the engine reads them together as one settlement.
CREATE TEMP TABLE tmp_settlement_merge AS
SELECT staff_id, period_year, period_month, MIN(status) AS status, SUM(amount) AS amount,
       MAX(branch_id) AS branch_id, MAX(reviewed_by) AS reviewed_by, MAX(reviewed_at) AS reviewed_at,
       MAX(paid_at) AS paid_at, MAX(payroll_run_id) AS payroll_run_id,
       STRING_AGG(category || ': ' || amount || COALESCE(' (' || note || ')', ''), '; ' ORDER BY category) AS note,
       '{"legacy":true,"lines":[' || STRING_AGG('{"label":"' || category || '","amount":' || amount || '}', ',' ORDER BY category) || '],"bonuses":[]}' AS breakdown
FROM commission_earnings
WHERE category IN ('memberships', 'pos')
GROUP BY staff_id, period_year, period_month
HAVING COUNT(DISTINCT status) = 1;

DELETE FROM commission_earnings c
USING tmp_settlement_merge m
WHERE c.staff_id = m.staff_id AND c.period_year = m.period_year AND c.period_month = m.period_month
  AND c.category IN ('memberships', 'pos');

INSERT INTO commission_earnings (staff_id, period_year, period_month, category, amount, computed_amount, status, note,
                                 reviewed_by, reviewed_at, paid_at, payroll_run_id, branch_id, breakdown_json)
SELECT staff_id, period_year, period_month, 'total', amount, amount, status, note,
       reviewed_by, reviewed_at, paid_at, payroll_run_id, branch_id, breakdown
FROM tmp_settlement_merge
ON CONFLICT DO NOTHING;
