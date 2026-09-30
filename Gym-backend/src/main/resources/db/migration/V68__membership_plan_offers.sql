-- V68__membership_plan_offers.sql
-- Additive only: a manual, time-boxed offer on a membership plan ("New Year Offer:
-- 10% off until 31 Jan"). `price` stays the regular price; the offer price is
-- derived from these columns wherever a member is charged.
-- The legacy `discount` column is left untouched and no longer used for pricing.

ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_type VARCHAR(20);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_value NUMERIC(10, 2);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_label VARCHAR(100);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_start_date DATE;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS offer_end_date DATE;
