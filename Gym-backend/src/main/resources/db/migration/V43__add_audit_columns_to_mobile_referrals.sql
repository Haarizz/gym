-- MobileReferralProfile and MobileReferralAttribution extend BaseEntity,
-- which includes created_by and updated_by columns. V42 only created
-- created_at and updated_at. Adding the missing columns here.
ALTER TABLE mobile_referral_profiles ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE mobile_referral_profiles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE mobile_referral_attributions ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE mobile_referral_attributions ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
