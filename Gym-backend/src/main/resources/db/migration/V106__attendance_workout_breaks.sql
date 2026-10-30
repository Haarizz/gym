-- Breaks inside a workout (member taps Take Break / Resume Workout in the app). The member
-- stays checked in; only the workout timer pauses. workout_break_start_time is set while a
-- break is running; workout_break_minutes adds up finished breaks and is left out of
-- workout_minutes.
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workout_break_start_time TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS workout_break_minutes INT NOT NULL DEFAULT 0;
