-- V88__pos_commission.sql
-- Commission for POS sales, set per role in Staffs & Trainers > Settings alongside the
-- membership rates: a percentage of each completed POS sale (net of refunds) and/or a
-- fixed amount for every completed sale. Credited to the cashier who rang the sale up
-- (sale_transactions.created_by = their login). NULL = no POS commission for that role.
ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS pos_commission NUMERIC(5, 2);
ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS pos_commission_per_sale NUMERIC(10, 2);
