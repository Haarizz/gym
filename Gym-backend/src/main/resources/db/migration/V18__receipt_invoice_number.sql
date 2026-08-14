-- Gives every bill its own invoice number, distinct from its receipt number.
--
-- Previously a bill's Invoice line and Payment line on the member Statement
-- of Account both displayed the exact same "RCPT-..." string (both derived
-- from the one underlying receipts row), which reads as if two separate
-- documents share one number. Bills now get a real "INV-{year}-{00001}"
-- number (via the same VoucherNumberService/voucher_sequences infrastructure
-- already used for JV/PV/RV) stamped at creation, kept alongside receipt_no
-- rather than replacing it, so nothing that already relies on receipt_no
-- (search, "View Receipt" lookups, printed receipts) changes behavior.

ALTER TABLE receipts ADD COLUMN invoice_no VARCHAR(50);
