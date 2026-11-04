-- Shift breaks become a duration ("1 hr") the employee takes whenever they need it, instead of a
-- fixed break_start–break_end window. Existing windows are converted to their length; the old
-- columns stay (unused for new edits) so nothing already stored is lost.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_minutes INTEGER;

UPDATE shifts
SET break_minutes = (((EXTRACT(EPOCH FROM (break_end - break_start)) / 60)::int % 1440) + 1440) % 1440
WHERE break_minutes IS NULL
  AND break_start IS NOT NULL
  AND break_end IS NOT NULL;
