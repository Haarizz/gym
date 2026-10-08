-- POS session controls (BillBull parity): suspend / resume, supervisor takeover, a closing
-- workflow (selling stops once closing has started; only a supervisor can cancel it),
-- supervisor approval for cash variances, activity heartbeats, and an optional business-day
-- window (start / scheduled end / extension) evaluated in the branch's time zone.
-- Idempotent.
DO $$
BEGIN
    IF to_regclass('public.pos_sessions') IS NOT NULL THEN
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS closing_started_at TIMESTAMP;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS closing_started_by VARCHAR(100);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(100);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS taken_over_from VARCHAR(100);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS variance_approved_by VARCHAR(100);
    END IF;

    IF to_regclass('public.pos_settings') IS NOT NULL THEN
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS business_day_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS business_day_start VARCHAR(5);
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS business_day_end VARCHAR(5);
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS business_day_extension_minutes INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS time_zone VARCHAR(60);
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS require_supervisor_for_variance BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;
