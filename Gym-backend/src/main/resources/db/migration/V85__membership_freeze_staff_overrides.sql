-- V85__membership_freeze_staff_overrides.sql
-- Additive only: staff freezes now follow the plan's freeze policy, so record
-- when a manager went past the plan's limits, when staff waived the extra-day
-- charge, and who applied the freeze.

ALTER TABLE membership_freezes ADD COLUMN IF NOT EXISTS limits_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE membership_freezes ADD COLUMN IF NOT EXISTS charge_waived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE membership_freezes ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(255);
