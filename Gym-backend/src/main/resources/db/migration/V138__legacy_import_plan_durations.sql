-- Plans keep their real length unit.
--
-- The old GymBios stored a plan as duration_type (daily/weekly/monthly/annual) +
-- duration_value. The importer ignored duration_type and wrote every plan as
-- "Daily", so a "1 Month Membership" (monthly, 1) arrived as a 1-DAY plan: renewals,
-- new memberships and expiry from the app gave one day, and the plan list read
-- "1 daily". The importer now keeps the unit (LegacyGymTransformer.Span); this file
-- repairs gyms already imported.
--
-- The dump itself is not in the tenant DB, so an imported Daily plan is corrected only
-- when its NAME states the same number of months / years / weeks as its value
-- ("1 Month Membership" = 1, "4MONTHS" = 4, "1 year" = 1). Plans that really were
-- daily ("Silver Individual" 35, "10 DAYS" 10, "1 Day") don't match and stay daily,
-- and a day pass / walk-in plan (name says day/daily/pass/walk, or plan type Walk-In)
-- is never touched.

-- 1. Imported plans: unit from the name, when the name's number equals the value.
CREATE TEMP TABLE v138_fixed_plans ON COMMIT DROP AS
SELECT id, name, n, new_type
FROM (
    SELECT p.id, p.name, p.duration_value::int AS n,
           (regexp_match(lower(p.name), '([0-9]+)\s*(months?|mnths?|years?|yrs?|weeks?|wks?)\y')) AS m
    FROM membership_plans p
    WHERE p.created_by = 'legacy-import'
      AND lower(trim(p.duration_type)) = 'daily'
      AND trim(p.duration_value) ~ '^[0-9]+$'
      -- day passes / walk-ins stay daily whatever else the name says
      AND lower(p.name) !~ '(day|daily|pass|walk)'
      AND coalesce(p.plan_type, '') <> 'Walk-In'
) x
CROSS JOIN LATERAL (SELECT CASE
        WHEN x.m[2] LIKE 'm%' THEN 'Monthly'
        WHEN x.m[2] LIKE 'y%' THEN 'Annual'
        ELSE 'Weekly' END AS new_type) t
WHERE x.m IS NOT NULL AND x.m[1]::int = x.n AND x.n > 0;

UPDATE membership_plans p
SET duration_type = f.new_type
FROM v138_fixed_plans f
WHERE p.id = f.id;

-- 2. Their imported bills: a period the importer ended "value" days after it started
--    (anything else was already set from the member's real end date) gets the real
--    length. Where due_date was written as that same end, it moves with it.
UPDATE receipts r
SET valid_till = r.valid_from + CASE f.new_type
                                   WHEN 'Monthly' THEN make_interval(months => f.n)
                                   WHEN 'Annual'  THEN make_interval(years => f.n)
                                   ELSE make_interval(weeks => f.n) END,
    due_date = CASE WHEN r.due_date = r.valid_till
                    THEN r.valid_from + CASE f.new_type
                                           WHEN 'Monthly' THEN make_interval(months => f.n)
                                           WHEN 'Annual'  THEN make_interval(years => f.n)
                                           ELSE make_interval(weeks => f.n) END
                    ELSE r.due_date END
FROM v138_fixed_plans f
WHERE r.created_by = 'legacy-import'
  AND lower(r.plan_name) = lower(f.name)
  AND r.valid_from IS NOT NULL
  AND r.valid_till = r.valid_from + make_interval(days => f.n);

-- 3. Every plan's display text from its type + value, the way MembershipPlanService
--    now writes it ("1 month", "3 months", "1 year") — it used to read "1 monthly".
UPDATE membership_plans p
SET duration = v.n || ' ' || CASE
        WHEN v.t IN ('days', 'day', 'daily')                                THEN CASE WHEN v.n = 1 THEN 'day' ELSE 'days' END
        WHEN v.t IN ('weeks', 'week', 'weekly')                             THEN CASE WHEN v.n = 1 THEN 'week' ELSE 'weeks' END
        WHEN v.t IN ('months', 'month', 'monthly')                          THEN CASE WHEN v.n = 1 THEN 'month' ELSE 'months' END
        WHEN v.t = 'quarterly'                                              THEN CASE WHEN v.n = 1 THEN 'quarter' ELSE 'quarters' END
        WHEN v.t IN ('years', 'year', 'yearly', 'annual', 'annually')       THEN CASE WHEN v.n = 1 THEN 'year' ELSE 'years' END
        ELSE CASE WHEN v.n = 1 THEN 'session' ELSE 'sessions' END END
FROM (
    SELECT id, trim(duration_value)::int AS n, lower(trim(duration_type)) AS t
    FROM membership_plans
    WHERE trim(duration_value) ~ '^[0-9]+$'
      AND lower(trim(duration_type)) IN ('days', 'day', 'daily', 'weeks', 'week', 'weekly', 'months', 'month', 'monthly',
                                         'quarterly', 'years', 'year', 'yearly', 'annual', 'annually', 'sessions', 'session')
) v
WHERE p.id = v.id;
