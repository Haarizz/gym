-- Billing › Pending Payments: writing off an uncollectable member due.
--  * A due is an open member bill (receipts row, status Pending/Overdue/Partial). A write-off
--    clears what is still owed on it: status becomes 'Written Off' and written_off_amount holds
--    the cleared amount. amount, paid_amount and total_paid_to_date are left as they were.
--  * Not a payment: no settlement receipt, no receipt voucher, no journal entry. Member bills
--    are booked cash-basis (only money received is journaled), so nothing sits in a ledger to reverse.
--  * member_due_write_offs is the permanent history. It copies the member and bill details so a
--    row still reads correctly after the member is renamed, archived or deleted.

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS written_off_amount NUMERIC(10, 2);

CREATE TABLE IF NOT EXISTS member_due_write_offs (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    receipt_id BIGINT NOT NULL,
    receipt_no VARCHAR(255),
    invoice_no VARCHAR(255),
    member_db_id BIGINT,
    member_code VARCHAR(255),
    member_name VARCHAR(255),
    member_phone VARCHAR(255),
    bill_description VARCHAR(500),
    bill_date TIMESTAMP WITHOUT TIME ZONE,
    due_date TIMESTAMP WITHOUT TIME ZONE,
    original_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL,
    written_off_amount NUMERIC(12, 2) NOT NULL,
    -- UNCOLLECTABLE | DISCONTINUED | MANAGEMENT_DECISION | OLD_BALANCE | OTHER
    reason VARCHAR(40) NOT NULL,
    notes TEXT,
    written_off_by VARCHAR(255) NOT NULL,
    written_off_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- One write-off per bill: a second attempt (double click, two staff at once) fails here.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_due_write_offs_receipt ON member_due_write_offs(receipt_id);
CREATE INDEX IF NOT EXISTS idx_member_due_write_offs_branch_date ON member_due_write_offs(branch_id, written_off_at);
CREATE INDEX IF NOT EXISTS idx_member_due_write_offs_member ON member_due_write_offs(member_db_id);
