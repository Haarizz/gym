-- Helenz, imported before the importer read the old `staff` table and member emails.
-- Run against the tenant DB (e.g. gymbios_helenz). Safe to re-run.
--
-- 1. The old system's only staff record (user.helenz / EMP0295, Receptionist) → employees, home
--    branch, no app login (enable it on the Staff page).
-- 2. Receipts/freezes say "user.helenz" (the old login); the app credits a staff member's sales by
--    their name in processed_by, so they now say the staff name "user helenz".
-- 3. Member emails: the old system stored "<phone>@temp.local" when none was given — those stay
--    blank. The only real one is GYM20269830's ab@gmail.com.
BEGIN;

INSERT INTO employees (staff_id, name, email, phone, role, department, address, base_salary, monthly_target,
    join_date, status, app_access_enabled, accepts_member_messages, branch_id, created_at, created_by)
SELECT 'EMP0295', 'user helenz', 'sreenathmh@gmail.com', '9745771825', 'Receptionist', NULL, NULL, 0.00, 60000.00,
    DATE '2026-02-09', 'active', false, true, (SELECT MIN(branch_id) FROM members), TIMESTAMP '2026-02-09 02:09:55',
    'legacy-import'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE lower(email) = 'sreenathmh@gmail.com' OR staff_id = 'EMP0295');

INSERT INTO staff_branches (staff_id, branch_id, created_at)
SELECT e.id, e.branch_id, e.created_at FROM employees e
WHERE e.staff_id = 'EMP0295' AND e.branch_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM staff_branches sb WHERE sb.staff_id = e.id AND sb.branch_id = e.branch_id);

UPDATE receipts SET processed_by = 'user helenz' WHERE processed_by = 'user.helenz';
UPDATE membership_freezes SET recorded_by = 'user helenz' WHERE recorded_by = 'user.helenz';

UPDATE members SET email = 'ab@gmail.com'
WHERE member_id = 'GYM20269830' AND email IS NULL
  AND NOT EXISTS (SELECT 1 FROM members WHERE lower(email) = 'ab@gmail.com');

SELECT id, staff_id, name, email, role, status, branch_id FROM employees WHERE staff_id = 'EMP0295';
SELECT processed_by, count(*) FROM receipts GROUP BY 1 ORDER BY 2 DESC;

COMMIT;
