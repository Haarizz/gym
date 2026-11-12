-- Billing › Refunds: a member refund is a POSTED credit note made from the Refunds tab.
-- These columns say why, how and what happened to the plan, so the tab, the printed
-- refund voucher and the reports don't have to parse the free-text reason.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS source            VARCHAR(30);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS reason_code       VARCHAR(40);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS cancelled_plan    BOOLEAN NOT NULL DEFAULT FALSE;
-- Unpaid part of the bill cleared when the plan was cancelled with the refund.
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS due_cleared       NUMERIC(12, 2);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS bank_account_code VARCHAR(50);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255);
-- Card / transfer reference the money went back under.
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS refund_reference  VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_credit_notes_linked_receipt ON credit_notes (linked_receipt_id);
