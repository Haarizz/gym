-- V89__user_theme_preference.sql
-- Each user's own UI theme ("light" | "dark" | "system"), read and saved through
-- GET/PUT /api/auth/preferences so the admin web app can apply it right after login on
-- any device. NULL = never chosen (the app keeps its default).
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(10);
