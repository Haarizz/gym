-- V110__member_addon_payments.sql
-- A member buying an add-on in the app can now pay part of it from their wallet, and a
-- Cash/Credit/Mixed payment waits for staff approval (status 'Pending Approval') like a
-- paid booking does. wallet_amount is what came out of the wallet, so a rejected payment
-- can give it back. A cancelled add-on's payment goes back to the wallet; refunded_amount
-- and refunded_at record that it did, so it can never be refunded twice.
ALTER TABLE member_addons ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(10, 2);
ALTER TABLE member_addons ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2);
ALTER TABLE member_addons ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
