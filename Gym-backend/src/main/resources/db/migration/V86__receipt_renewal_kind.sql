-- V86__receipt_renewal_kind.sql
-- BG_103: whether a "Renewal" receipt was a like-for-like renewal, an upgrade or a
-- downgrade, decided at renewal time from the member's plan just before it (the same
-- rule the Renewals & Upgrades screen shows as "Detected as ..."). The dashboard used
-- to re-derive this from receipt history, which misfiled a same-plan renewal as an
-- upgrade whenever the plan had been changed without a receipt (e.g. via Edit Member).
-- NULL on older receipts, which keep the history-based fallback.
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS renewal_kind VARCHAR(20);
