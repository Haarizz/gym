-- credit_notes.cancelled_plan must default to false everywhere.
--
-- V136 adds it as "ADD COLUMN IF NOT EXISTS … NOT NULL DEFAULT FALSE", but a gym created
-- after V136 gets the table from Hibernate first (CreditNote: NOT NULL, no default), so
-- V136 skips the column and it has no default. Any insert that leaves the column out —
-- Import Gym's refunds, for one — then fails with "null value in column cancelled_plan".
ALTER TABLE credit_notes ALTER COLUMN cancelled_plan SET DEFAULT FALSE;
