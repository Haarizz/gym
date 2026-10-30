-- Re-entry after a check-out no longer resumes the visit: any check-out ends it and the
-- branch's cooldown applies. attendance.break_minutes (V105) only tracked that re-entry gap.
-- check_in_settings.break_grace_minutes stays — it is now the length of a workout break
-- (Take Break in the member app; see V106).
ALTER TABLE attendance DROP COLUMN IF EXISTS break_minutes;
