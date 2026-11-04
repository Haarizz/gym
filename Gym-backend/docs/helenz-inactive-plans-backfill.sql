-- DMT_02: the Import Gym run skipped the old system's 2 inactive plans (Helenz #21 "Daily",
-- #22 "1 Day"), so Manage Plans showed 22 instead of 24. LegacyGymTransformer now imports them;
-- this adds them to a tenant that was imported before that fix. Run against the tenant DB
-- (e.g. gymbios_helenz). Safe to re-run.
--
-- Both old plans are AED 20 / 1 day walk-ins, identical to the imported active "1 Day", so they are
-- copied from it. #22 shares the name "1 Day" with the active plan, and plans are looked up by
-- name, so it is imported as "1 Day (inactive #22)" (same name the importer now gives it).
BEGIN;

INSERT INTO membership_plans (created_at, created_by, updated_at, updated_by, additional_member_price,
    allow_additional_members, assignable_trainers, attendance_limit, attendance_period, attendance_value,
    auto_calculate_total, auto_unfreeze, branch_id, charge_per_extra_day, description, discount, duration,
    duration_type, duration_value, family_billing_mode, free_days_allowed, max_adult_members, max_capacity,
    max_child_members, max_family_members, max_freeze_days, max_freeze_occurrences, max_sessions,
    membership_capacity, name, offer_end_date, offer_label, offer_start_date, offer_type, offer_value,
    plan_type, price, price_per_member, selected_campaigns, selected_facilities, selected_promotions,
    status, training_streams, type)
SELECT now(), 'legacy-import', updated_at, updated_by, additional_member_price,
    allow_additional_members, assignable_trainers, attendance_limit, attendance_period, attendance_value,
    auto_calculate_total, auto_unfreeze, branch_id, charge_per_extra_day, description, discount, duration,
    duration_type, duration_value, family_billing_mode, free_days_allowed, max_adult_members, max_capacity,
    max_child_members, max_family_members, max_freeze_days, max_freeze_occurrences, max_sessions,
    membership_capacity, n.name, offer_end_date, offer_label, offer_start_date, offer_type, offer_value,
    plan_type, price, price_per_member, selected_campaigns, selected_facilities, selected_promotions,
    'Inactive', training_streams, type
FROM membership_plans src
CROSS JOIN (VALUES ('Daily'), ('1 Day (inactive #22)')) AS n(name)
WHERE src.name = '1 Day' AND src.created_by = 'legacy-import'
  AND NOT EXISTS (SELECT 1 FROM membership_plans x WHERE x.name = n.name);

SELECT status, count(*) FROM membership_plans GROUP BY status ORDER BY status;

COMMIT;
