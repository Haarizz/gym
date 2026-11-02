-- Revenue targets per sales category alongside the overall revenue_target: memberships
-- (admissions, renewals, non-PT add-ons, walk-ins), POS sales and personal training.
-- Achieved figures are computed live (StaffProgressCalculator), so only targets are stored.
ALTER TABLE staff_targets ADD COLUMN IF NOT EXISTS membership_revenue_target NUMERIC(12, 2);
ALTER TABLE staff_targets ADD COLUMN IF NOT EXISTS pos_revenue_target NUMERIC(12, 2);
ALTER TABLE staff_targets ADD COLUMN IF NOT EXISTS pt_revenue_target NUMERIC(12, 2);
