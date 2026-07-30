-- Supporting indexes for the columns list/search endpoints now actually filter and
-- sort on at the query level (see docs/gymbios-financial-roadmap.html — M1).
--
-- JournalVoucherService, ReceiptVoucherService and LedgerTransactionService were
-- converted from "load the whole table, filter with a Java stream" to
-- Specification/derived-query filtering in this pass. That only pays off if these
-- columns are actually indexed — otherwise Postgres still has to scan the full
-- table per query, just inside the database instead of inside the JVM.
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_status ON journal_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_date   ON journal_vouchers(date);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status       ON payment_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_payment_date ON payment_vouchers(payment_date);

CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_status ON receipt_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_date   ON receipt_vouchers(date);
