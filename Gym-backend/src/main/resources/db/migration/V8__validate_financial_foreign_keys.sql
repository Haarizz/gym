-- Closes the follow-up left by V2__add_financial_foreign_keys.sql (see docs/gymbios-financial-roadmap.html — C2).
--
-- V2 added these 5 foreign keys as NOT VALID because it was written without access to
-- the live database, so it couldn't confirm zero orphaned rows existed. That check has
-- since been run directly against the local GYMBIOS database (the 5 audit SELECTs from
-- V2's own follow-up section) and came back clean on every relationship. This migration
-- runs the matching VALIDATE CONSTRAINT statements to make the guarantee retroactive
-- for existing rows, not just new writes.
--
-- If this fails on a different environment (staging/prod), it means that copy of the
-- database has orphaned rows the local one didn't — re-run V2's audit SELECTs there,
-- resolve what they return, and retry.

ALTER TABLE journal_voucher_lines VALIDATE CONSTRAINT fk_jvl_journal_voucher;
ALTER TABLE payment_voucher_bills VALIDATE CONSTRAINT fk_pvb_payment_voucher;
ALTER TABLE bank_statement_lines VALIDATE CONSTRAINT fk_bsl_reconciliation;
ALTER TABLE supplier_bill_items VALIDATE CONSTRAINT fk_sbi_supplier_bill;
ALTER TABLE account_heads VALIDATE CONSTRAINT fk_account_heads_parent;
