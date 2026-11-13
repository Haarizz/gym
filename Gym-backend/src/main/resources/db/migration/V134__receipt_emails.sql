-- Billing › Email receipt / Email invoice: every email sent to a member with a receipt or
-- invoice PDF, sent or failed, so staff can see when (and to whom) a document went out.

CREATE TABLE IF NOT EXISTS receipt_emails (
    id             BIGSERIAL PRIMARY KEY,
    receipt_id     BIGINT       NOT NULL,
    -- RECEIPT (payment receipt) | INVOICE (tax invoice)
    document_type  VARCHAR(20)  NOT NULL,
    to_email       TEXT         NOT NULL,
    subject        VARCHAR(255) NOT NULL,
    -- SENT | FAILED
    status         VARCHAR(10)  NOT NULL,
    error          TEXT,
    sent_by        VARCHAR(255),
    sent_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    branch_id      BIGINT
);

CREATE INDEX IF NOT EXISTS idx_receipt_emails_receipt ON receipt_emails (receipt_id, sent_at DESC);
