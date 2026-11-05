-- Per-branch rule for what a membership freeze does to the member's add-ons and facility
-- access: paused with the membership (their end dates move out by the frozen days on
-- unfreeze) or left running. Default keeps both paused.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS freeze_pauses_addons BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS freeze_pauses_facilities BOOLEAN NOT NULL DEFAULT TRUE;

-- The branch's rule copied onto the member when the freeze starts, so changing the setting
-- later doesn't change a freeze already running. NULL when not frozen.
ALTER TABLE members ADD COLUMN IF NOT EXISTS freeze_pauses_addons BOOLEAN;
ALTER TABLE members ADD COLUMN IF NOT EXISTS freeze_pauses_facilities BOOLEAN;

UPDATE members SET freeze_pauses_addons = TRUE, freeze_pauses_facilities = TRUE
 WHERE LOWER(membership_status) = 'frozen' AND freeze_pauses_addons IS NULL;
