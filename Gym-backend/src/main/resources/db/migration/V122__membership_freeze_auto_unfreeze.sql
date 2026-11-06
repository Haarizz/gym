-- V122__membership_freeze_auto_unfreeze.sql (renumbered from V121: main took V121 for the performance engine)
-- Additive only: staff can choose, per freeze, whether it ends by itself on its
-- end date. NULL (every existing freeze, and member app freezes) keeps following
-- the plan's auto_unfreeze setting.

ALTER TABLE membership_freezes ADD COLUMN IF NOT EXISTS auto_unfreeze BOOLEAN;
