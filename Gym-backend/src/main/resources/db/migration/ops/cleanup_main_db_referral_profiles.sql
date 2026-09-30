-- One-time manual cleanup: run ONLY against the MAIN (platform / control-plane
-- default) database of a deployment with tenant.routing.enabled=true — never
-- against a gym (tenant) database, and never on a single-database deployment
-- (routing off), where the main database IS the gym database.
--
-- Not a Flyway migration: the migration folder is applied to every tenant
-- database too, where these rows are real, claimable referral codes.
--
-- Why: before referral codes were limited to active gym members, opening
-- Referrals in the app with no gym selected created a mobile_referral_profiles
-- row in the main database. Claims only ever look codes up in gym databases, so
-- those codes could never be claimed (400 "Invalid referral code"). The app no
-- longer creates them; this removes the ones already handed out. Their owners
-- get a working code (in their gym's database) the next time they open
-- Referrals as an active member.
--
-- Safe to re-run.

-- 1. Review what will be removed.
SELECT id, global_user_id, referral_code
FROM mobile_referral_profiles
ORDER BY id;

-- 2. Remove them.
DELETE FROM mobile_referral_profiles;
