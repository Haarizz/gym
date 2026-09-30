-- Reward Passes: MEMBERSHIP_DISCOUNT / FREE_PT / FREE_CLASS rewards are now spent
-- at renewal or booking time instead of only being flipped to REDEEMED, and a
-- COUPON reward's code can be used by anyone at checkout.
--   reward_unit      — PERCENT / AMOUNT, copied from the rule's unit at generation
--   consumed_context — MEMBERSHIP / BOOKING / COUPON: where the reward was spent
--   consumed_ref_id  — member id (MEMBERSHIP/COUPON) or booking id (BOOKING)
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS reward_unit VARCHAR(20);
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS consumed_context VARCHAR(30);
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS consumed_ref_id BIGINT;

-- The Reward Pass that paid for this booking, so cancelling it can give the pass back.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reward_id BIGINT;
