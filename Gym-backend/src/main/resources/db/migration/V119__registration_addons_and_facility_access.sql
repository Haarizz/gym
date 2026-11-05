-- Add-ons and facility access sold at New Member Registration, on the membership's own
-- receipt: the receipt keeps its add-on lines (so the ledger can split add-on revenue from
-- membership revenue and a single add-on can be cancelled), and a member add-on records
-- which add-on plan or facility it was sold from.
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS addon_items TEXT;

ALTER TABLE member_addons ADD COLUMN IF NOT EXISTS addon_plan_id BIGINT;
ALTER TABLE member_addons ADD COLUMN IF NOT EXISTS facility_id BIGINT;
