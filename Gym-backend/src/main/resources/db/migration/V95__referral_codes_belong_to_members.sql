-- V95__referral_codes_belong_to_members.sql
-- A referral code (and the referrer side of an attribution) now belongs to the
-- referrer's members row in this gym, not to a user id. The user id was always
-- read as a global user id, but a gym-created login's id is this gym's users.id —
-- a different number space — so its code was filed under a global id that is
-- either nobody (rewards silently lost) or some app-registered member who then
-- shared the code and took the rewards.
--
-- Additive and idempotent. global_user_id columns stay (still filled for
-- app-registered members) but become optional, since a gym-created login has none.
-- Existing rows are all app-registered members, so they backfill through
-- members.global_user_id.

ALTER TABLE mobile_referral_profiles ADD COLUMN IF NOT EXISTS member_id BIGINT;
ALTER TABLE mobile_referral_profiles ALTER COLUMN global_user_id DROP NOT NULL;

UPDATE mobile_referral_profiles p
SET member_id = m.id
FROM members m
WHERE p.member_id IS NULL
  AND m.global_user_id = p.global_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_referral_profiles_member_id
    ON mobile_referral_profiles(member_id);

ALTER TABLE mobile_referral_attributions ADD COLUMN IF NOT EXISTS referrer_member_id BIGINT;
ALTER TABLE mobile_referral_attributions ALTER COLUMN referrer_global_user_id DROP NOT NULL;

UPDATE mobile_referral_attributions a
SET referrer_member_id = m.id
FROM members m
WHERE a.referrer_member_id IS NULL
  AND m.global_user_id = a.referrer_global_user_id;

CREATE INDEX IF NOT EXISTS idx_mobile_ref_attr_referrer_member
    ON mobile_referral_attributions(referrer_member_id);
