-- Phase 3: rounds out the voucher set. Previously ContraVoucher (cash<->bank
-- transfers), DebitNote (supplier returns/adjustments) and CreditNote
-- (member refunds/adjustments not tied to a POS SaleTransaction) had no
-- dedicated entity — accountants had to go through a manual Journal Voucher.
-- All three post through FinancialEventService like every other module
-- (onContraVoucherPosted / onDebitNoteIssued / onCreditNoteIssued).

CREATE TABLE contra_vouchers (
    id                BIGSERIAL PRIMARY KEY,
    voucher_no        VARCHAR(50) NOT NULL UNIQUE,
    date              DATE NOT NULL,
    from_account_code VARCHAR(20) NOT NULL,
    from_account_name VARCHAR(255),
    to_account_code   VARCHAR(20) NOT NULL,
    to_account_name   VARCHAR(255),
    amount            NUMERIC(12,2) NOT NULL,
    narration         TEXT,
    reference         VARCHAR(255),
    status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE TABLE debit_notes (
    id             BIGSERIAL PRIMARY KEY,
    voucher_no     VARCHAR(50) NOT NULL UNIQUE,
    date           DATE NOT NULL,
    supplier_id    BIGINT,
    supplier_name  VARCHAR(255),
    linked_bill_id BIGINT,
    reason         TEXT,
    subtotal       NUMERIC(12,2) NOT NULL,
    tax_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount   NUMERIC(12,2) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE TABLE credit_notes (
    id                BIGSERIAL PRIMARY KEY,
    voucher_no        VARCHAR(50) NOT NULL UNIQUE,
    date              DATE NOT NULL,
    member_db_id      BIGINT,
    member_name       VARCHAR(255),
    linked_receipt_id BIGINT,
    reason            TEXT,
    subtotal          NUMERIC(12,2) NOT NULL,
    tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount      NUMERIC(12,2) NOT NULL,
    refund_method     VARCHAR(20) NOT NULL DEFAULT 'Cash',
    status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

CREATE INDEX idx_contra_vouchers_date ON contra_vouchers (date);
CREATE INDEX idx_debit_notes_date ON debit_notes (date);
CREATE INDEX idx_debit_notes_supplier ON debit_notes (supplier_id);
CREATE INDEX idx_credit_notes_date ON credit_notes (date);
CREATE INDEX idx_credit_notes_member ON credit_notes (member_db_id);
