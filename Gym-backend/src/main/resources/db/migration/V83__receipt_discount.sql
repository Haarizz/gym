-- V83__receipt_discount.sql
-- What a bill was discounted by (plan offer, promo/coupon code, Reward Pass, staff
-- discount) and a label for it, so payment history can show a discounted or free
-- bill as such instead of just a lower amount.
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_label VARCHAR(255);
