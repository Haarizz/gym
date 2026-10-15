-- Plans created from the mobile wizard were saved as 'ACTIVE'/'INACTIVE'/'DRAFT',
-- which the case-sensitive status lookups ("Active") never matched (BG_112).
-- MembershipPlanService now normalizes on save; bring existing rows in line.
UPDATE membership_plans
SET status = UPPER(LEFT(TRIM(status), 1)) || LOWER(SUBSTRING(TRIM(status) FROM 2))
WHERE status IS NOT NULL
  AND TRIM(status) <> ''
  AND status <> UPPER(LEFT(TRIM(status), 1)) || LOWER(SUBSTRING(TRIM(status) FROM 2));
