-- Expected gym visit date for the referred person, captured on the Add Referral form.
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS visit_date DATE;
