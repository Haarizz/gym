-- PT targets follow money paid for PT (packages AND normal paid PT sessions), so the
-- package-only metric PT_PACKAGE_SALE becomes PT_SALE. PT_SESSION_DELIVERED now needs the
-- member to have come (checked in / counted no-show), like package usage.
UPDATE performance_events      SET metric = 'PT_SALE' WHERE metric = 'PT_PACKAGE_SALE';
UPDATE target_lines            SET metric = 'PT_SALE' WHERE metric = 'PT_PACKAGE_SALE';
UPDATE incentive_plan_lines    SET metric = 'PT_SALE' WHERE metric = 'PT_PACKAGE_SALE';
UPDATE incentive_plan_bonuses  SET metric = 'PT_SALE' WHERE metric = 'PT_PACKAGE_SALE';
UPDATE incentive_plan_bonuses  SET condition_metric = 'PT_SALE' WHERE condition_metric = 'PT_PACKAGE_SALE';

-- Re-derive every event once on the next start (paid PT bookings, new delivered rule).
DELETE FROM performance_engine_state WHERE key = 'events_backfilled';
