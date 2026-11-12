-- GymOS › Face Device Configuration: end-of-day email report + outage tracking.

-- Comma-separated addresses that get the daily sync report (NULL = no report).
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS report_emails TEXT;
-- Gym-local date of the last nightly report, so each day is sent once.
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS last_report_date DATE;
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS last_report_at TIMESTAMP;
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS last_report_message TEXT;
-- Set when a sync finds the device / middleware unavailable, cleared when it answers again.
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS offline_since TIMESTAMP;
-- The most recent finished outage, for the report.
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS last_outage_start TIMESTAMP;
ALTER TABLE face_devices ADD COLUMN IF NOT EXISTS last_outage_end TIMESTAMP;
