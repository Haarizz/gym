-- A membership that expires now raises a due for the plan's current price (once per expiry).
-- members.expiry_due_raised_for: the end date a due was last raised for, so each expiry
--   raises exactly one due; a renewal moves the end date and re-arms it.
-- receipts.renews_member_id: on an "Expiry Due" bill, the member whose membership paying it
--   renews (the payer may be their family head).
ALTER TABLE members  ADD COLUMN IF NOT EXISTS expiry_due_raised_for TIMESTAMP;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS renews_member_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_receipts_renews_member_id ON receipts (renews_member_id);

-- Going forward only: memberships already expired when this ships never get a due.
UPDATE members
   SET expiry_due_raised_for = COALESCE(membership_end_date, expiry_date)
 WHERE expiry_due_raised_for IS NULL
   AND COALESCE(membership_end_date, expiry_date) IS NOT NULL
   AND CAST(COALESCE(membership_end_date, expiry_date) AS DATE) < CURRENT_DATE;
