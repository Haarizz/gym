-- V100__attendance_workout_timer.sql
-- Workout timer on a member visit: the member starts/ends one workout per check-in
-- from the app. Checking out while it runs ends it at the check-out time.

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workout_start_time TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workout_end_time TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workout_minutes INTEGER;
