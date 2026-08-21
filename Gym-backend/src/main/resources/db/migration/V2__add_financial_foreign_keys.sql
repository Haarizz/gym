-- Referential integrity for the financial schema (see docs/gymbios-financial-roadmap.html — C2).
--
-- Every parent/child relationship below was previously a bare Long column with no
-- database-level foreign key, so an orphaned line/item/statement-line was possible
-- with no error. This migration adds the missing constraints.
--
-- IMPORTANT — this was written without access to the live database, so it cannot be
-- verified here that zero orphaned rows currently exist. To make this migration safe
-- to apply regardless, every constraint is added with NOT VALID: Postgres enforces it
-- for all new/future writes immediately, but does NOT scan or validate existing rows,
-- so this migration cannot fail or block on legacy data.
--
-- Existing data is therefore NOT yet guaranteed to satisfy these constraints. Before
-- relying on that guarantee, run the audit queries below against a staging copy of
-- the database, resolve any rows they return, and then run the VALIDATE CONSTRAINT
-- statements (also below) to fully close the gap. That validation step is a decision
-- for the team, not something this migration performs automatically.

-- ── journal_voucher_lines → journal_vouchers ──────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.journal_voucher_lines') IS NOT NULL
       AND to_regclass('public.journal_vouchers') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_jvl_journal_voucher_id ON journal_voucher_lines(journal_voucher_id);
        ALTER TABLE journal_voucher_lines
            ADD CONSTRAINT fk_jvl_journal_voucher
            FOREIGN KEY (journal_voucher_id) REFERENCES journal_vouchers(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END $$;

-- ── payment_voucher_bills → payment_vouchers ──────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.payment_voucher_bills') IS NOT NULL
       AND to_regclass('public.payment_vouchers') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_pvb_payment_voucher_id ON payment_voucher_bills(payment_voucher_id);
        ALTER TABLE payment_voucher_bills
            ADD CONSTRAINT fk_pvb_payment_voucher
            FOREIGN KEY (payment_voucher_id) REFERENCES payment_vouchers(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END $$;

-- ── bank_statement_lines → bank_reconciliations ───────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.bank_statement_lines') IS NOT NULL
       AND to_regclass('public.bank_reconciliations') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_bsl_reconciliation_id ON bank_statement_lines(reconciliation_id);
        ALTER TABLE bank_statement_lines
            ADD CONSTRAINT fk_bsl_reconciliation
            FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END $$;

-- ── supplier_bill_items → supplier_bills ──────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.supplier_bill_items') IS NOT NULL
       AND to_regclass('public.supplier_bills') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_sbi_bill_id ON supplier_bill_items(bill_id);
        ALTER TABLE supplier_bill_items
            ADD CONSTRAINT fk_sbi_supplier_bill
            FOREIGN KEY (bill_id) REFERENCES supplier_bills(id)
            ON DELETE RESTRICT
            NOT VALID;
    END IF;
END $$;

-- ── account_heads.parent_id → account_heads.id (self-referencing hierarchy) ───────
-- ON DELETE SET NULL: deleting a parent account should not cascade-delete its
-- children, it should just orphan them back to the root level.
DO $$
BEGIN
    IF to_regclass('public.account_heads') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_account_heads_parent_id ON account_heads(parent_id);
        ALTER TABLE account_heads
            ADD CONSTRAINT fk_account_heads_parent
            FOREIGN KEY (parent_id) REFERENCES account_heads(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- FOLLOW-UP — run manually once orphan-free data is confirmed (NOT executed by
-- this migration). Suggested order: run each SELECT; if it returns zero rows, run
-- the matching VALIDATE CONSTRAINT; if it returns rows, resolve them first.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- SELECT jvl.id, jvl.journal_voucher_id FROM journal_voucher_lines jvl
--   LEFT JOIN journal_vouchers jv ON jv.id = jvl.journal_voucher_id
--   WHERE jv.id IS NULL;
-- ALTER TABLE journal_voucher_lines VALIDATE CONSTRAINT fk_jvl_journal_voucher;
--
-- SELECT pvb.id, pvb.payment_voucher_id FROM payment_voucher_bills pvb
--   LEFT JOIN payment_vouchers pv ON pv.id = pvb.payment_voucher_id
--   WHERE pv.id IS NULL;
-- ALTER TABLE payment_voucher_bills VALIDATE CONSTRAINT fk_pvb_payment_voucher;
--
-- SELECT bsl.id, bsl.reconciliation_id FROM bank_statement_lines bsl
--   LEFT JOIN bank_reconciliations br ON br.id = bsl.reconciliation_id
--   WHERE br.id IS NULL;
-- ALTER TABLE bank_statement_lines VALIDATE CONSTRAINT fk_bsl_reconciliation;
--
-- SELECT sbi.id, sbi.bill_id FROM supplier_bill_items sbi
--   LEFT JOIN supplier_bills sb ON sb.id = sbi.bill_id
--   WHERE sb.id IS NULL;
-- ALTER TABLE supplier_bill_items VALIDATE CONSTRAINT fk_sbi_supplier_bill;
--
-- SELECT ah.id, ah.parent_id FROM account_heads ah
--   LEFT JOIN account_heads parent ON parent.id = ah.parent_id
--   WHERE ah.parent_id IS NOT NULL AND parent.id IS NULL;
-- ALTER TABLE account_heads VALIDATE CONSTRAINT fk_account_heads_parent;
