-- V110__booking_payment_rejection_reason.sql
-- Why staff rejected a Cash/Credit/Mixed booking payment, so the member app can show it
-- on the cancelled booking (it was only sent in the notification until now).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;
