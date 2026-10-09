-- V84__booking_payments.sql
-- A booking for a priced session is now paid for at booking time (mobile member
-- self-booking): what it cost before and after a promo/coupon code or Reward Pass,
-- how much came out of the member's wallet, the receipt that recorded the payment,
-- and — if it was cancelled — whether and how the payment was refunded.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gross_price NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_label VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS receipt_id BIGINT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_method VARCHAR(32);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(16);
