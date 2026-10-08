-- Every POS sale is also recorded as a back-office Sales Invoice (source = 'POS'),
-- so Sales & Purchases › Sales Invoice lists counter sales next to manual invoices.
-- POS invoices are read-only mirrors: the POS already moved the stock and posted the
-- ledger, so they are created CONFIRMED with stock_deducted = TRUE and are never
-- confirmed/cancelled/paid from the back office. Idempotent: safe to re-run.

ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS pos_transaction_id BIGINT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS returned_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_invoices_pos_transaction
    ON sales_invoices (pos_transaction_id) WHERE pos_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_invoices_source ON sales_invoices (source);

-- Backfill POS sales made before this migration.
DO $$
BEGIN
    IF to_regclass('public.sale_transactions') IS NULL OR to_regclass('public.sale_transaction_items') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO sales_invoices (
        invoice_number, invoice_date, due_date, payment_terms, reference, salesperson,
        customer_type, member_id, customer_name, customer_phone,
        status, payment_status, prices_include_tax,
        subtotal, discount_amount, footer_discount, taxable_amount, tax_amount,
        delivery_charge, round_off, total_amount, amount_paid, total_cogs, stock_deducted,
        payment_method, payment_breakdown, notes, internal_notes, branch_id,
        created_at, created_by, source, pos_transaction_id, returned_amount)
    SELECT
        'POS-' || COALESCE(NULLIF(regexp_replace(t.transaction_number, '^\D+', ''), ''), lpad(t.id::text, 10, '0')),
        COALESCE(t.business_date, t.created_at::date),
        COALESCE(t.business_date, t.created_at::date),
        'POS',
        t.transaction_number,
        t.cashier_name,
        CASE WHEN t.member_id IS NOT NULL THEN 'MEMBER' ELSE 'WALK_IN' END,
        t.member_id,
        COALESCE(t.member_name, 'Walk-in Customer'),
        t.member_phone,
        CASE WHEN t.status = 'VOIDED' THEN 'CANCELLED' ELSE 'CONFIRMED' END,
        CASE
            WHEN COALESCE(t.credit_amount, 0) - COALESCE(t.credit_settled_amount, 0) <= 0 THEN 'PAID'
            WHEN COALESCE(t.total_amount, 0) - (COALESCE(t.credit_amount, 0) - COALESCE(t.credit_settled_amount, 0)) > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
        END,
        COALESCE(t.tax_inclusive, FALSE),
        COALESCE(t.subtotal, 0),
        COALESCE(t.line_discount_amount, t.discount_amount, 0),
        COALESCE(t.bill_discount_amount, 0),
        COALESCE(t.taxable_amount, COALESCE(t.total_amount, 0) - COALESCE(t.tax_amount, 0)),
        COALESCE(t.tax_amount, 0),
        0,
        0,
        COALESCE(t.total_amount, 0),
        GREATEST(COALESCE(t.total_amount, 0) - GREATEST(COALESCE(t.credit_amount, 0) - COALESCE(t.credit_settled_amount, 0), 0), 0),
        COALESCE(t.total_cogs, 0),
        TRUE,
        t.payment_method,
        t.payment_breakdown,
        t.notes,
        'Recorded from POS' || COALESCE(' · ' || t.terminal_name, '') || COALESCE(' · cashier ' || t.cashier_name, ''),
        t.branch_id,
        t.created_at,
        t.created_by,
        'POS',
        t.id,
        COALESCE(t.refunded_amount, 0)
    FROM sale_transactions t
    WHERE NOT EXISTS (SELECT 1 FROM sales_invoices s WHERE s.pos_transaction_id = t.id);

    INSERT INTO sales_invoice_items (
        invoice_id, product_id, product_name, product_sku, warehouse_id, quantity,
        unit_price, discount_percent, discount_amount, footer_discount_share, tax_percent,
        taxable_amount, tax_amount, total_amount, cost_price)
    SELECT
        s.id, i.product_id, i.product_name, i.product_sku, i.warehouse_id, COALESCE(i.quantity, 0),
        COALESCE(i.unit_price, 0), COALESCE(i.discount_percent, 0), COALESCE(i.discount_amount, 0),
        COALESCE(i.bill_discount_share, 0), COALESCE(i.tax_rate, 0),
        COALESCE(i.taxable_amount, COALESCE(i.total_amount, 0) - COALESCE(i.tax_amount, 0)),
        COALESCE(i.tax_amount, 0),
        COALESCE(i.taxable_amount, COALESCE(i.total_amount, 0) - COALESCE(i.tax_amount, 0)) + COALESCE(i.tax_amount, 0),
        COALESCE(i.cost_price, 0)
    FROM sale_transaction_items i
    JOIN sales_invoices s ON s.pos_transaction_id = i.transaction_id
    WHERE i.product_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM sales_invoice_items x WHERE x.invoice_id = s.id);
END $$;
