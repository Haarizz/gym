-- Take Break moves from inside a workout to the visit itself (the member app no longer has
-- Start Workout). The V106 columns are renamed to match: break_start_time is set while a
-- break is running, break_minutes adds up finished breaks and is left out of total_minutes.
-- V107 dropped the old re-entry break_minutes column first, so the name is free.
ALTER TABLE attendance RENAME COLUMN workout_break_start_time TO break_start_time;
ALTER TABLE attendance RENAME COLUMN workout_break_minutes TO break_minutes;
