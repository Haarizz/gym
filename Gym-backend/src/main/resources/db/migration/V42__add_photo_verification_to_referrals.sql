-- Front-desk verification of the referee photo captured on the Add Referral
-- form. A referral with a photo can't be marked successful (and therefore
-- can't generate reward rules) until staff confirms the photo matches the
-- person who showed up, gating fraudulent/reused referrals.
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS photo_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS photo_verified_by VARCHAR(255);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS photo_verified_at TIMESTAMP;
