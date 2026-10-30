-- Family and Couple plans now always bill the head: the head pays for every family / couple
-- member on one invoice. The "individual" option (adults billing separately) is removed from
-- the plan form, so existing plans that used it switch over. New saves are normalised by
-- MembershipPlan.normalizeBillingMode().
UPDATE membership_plans
SET family_billing_mode = 'family_head'
WHERE LOWER(TRIM(plan_type)) IN ('family', 'couple')
  AND (family_billing_mode IS NULL OR family_billing_mode <> 'family_head');
