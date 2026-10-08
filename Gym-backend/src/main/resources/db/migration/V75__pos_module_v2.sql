-- V75__pos_module_v2.sql
-- Point of Sale v2, ported from BillBull's POS module: per-cashier sessions with
-- closing variance, X/Z reports and day close, held sales, partial returns,
-- POS credit sales with settlement, printers (browser / local print agent /
-- network ESC/POS), POS settings with supervisor approvals, and a POS audit trail.
--
-- Guarded/idempotent throughout: on the local profile Flyway is disabled and
-- Hibernate ddl-auto=update may already have created these columns/tables.

-- ── Sessions ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.pos_sessions') IS NOT NULL THEN
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS opened_by VARCHAR(255);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS closed_by VARCHAR(255);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS terminal_name VARCHAR(100);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS business_date DATE;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS expected_cash NUMERIC(12,2);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS cash_variance NUMERIC(12,2);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS card_settlement_amount NUMERIC(12,2);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS card_batch_no VARCHAR(100);
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS card_settlement_verified BOOLEAN;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS variance_remarks TEXT;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS force_closed BOOLEAN;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS force_close_reason TEXT;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS x_report_print_count INTEGER;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS day_close_id BIGINT;
        UPDATE pos_sessions SET business_date = CAST(opened_at AS DATE) WHERE business_date IS NULL AND opened_at IS NOT NULL;
        UPDATE pos_sessions SET force_closed = FALSE WHERE force_closed IS NULL;
        UPDATE pos_sessions SET x_report_print_count = 0 WHERE x_report_print_count IS NULL;
        CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions (status);
        CREATE INDEX IF NOT EXISTS idx_pos_sessions_business_date ON pos_sessions (business_date);
    END IF;
END $$;

-- ── Sales ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.sale_transactions') IS NOT NULL THEN
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS bill_discount_type VARCHAR(10);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS bill_discount_value NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS bill_discount_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN;
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS credit_settled_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS return_status VARCHAR(20);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS payment_allocations TEXT;
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS payment_summary VARCHAR(255);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS terminal_name VARCHAR(100);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS business_date DATE;
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS reprint_count INTEGER;
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS member_code VARCHAR(100);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS member_phone VARCHAR(50);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
        UPDATE sale_transactions SET business_date = CAST(created_at AS DATE) WHERE business_date IS NULL AND created_at IS NOT NULL;
        UPDATE sale_transactions SET bill_discount_amount = 0 WHERE bill_discount_amount IS NULL;
        UPDATE sale_transactions SET line_discount_amount = COALESCE(discount_amount, 0) WHERE line_discount_amount IS NULL;
        UPDATE sale_transactions SET credit_amount = 0 WHERE credit_amount IS NULL;
        UPDATE sale_transactions SET credit_settled_amount = 0 WHERE credit_settled_amount IS NULL;
        UPDATE sale_transactions SET refunded_amount = CASE WHEN status = 'REFUNDED' THEN COALESCE(total_amount, 0) ELSE 0 END WHERE refunded_amount IS NULL;
        UPDATE sale_transactions SET return_status = CASE WHEN status = 'REFUNDED' THEN 'FULL' ELSE 'NONE' END WHERE return_status IS NULL;
        UPDATE sale_transactions SET reprint_count = 0 WHERE reprint_count IS NULL;
        UPDATE sale_transactions SET tax_inclusive = FALSE WHERE tax_inclusive IS NULL;
        CREATE INDEX IF NOT EXISTS idx_sale_transactions_session ON sale_transactions (pos_session_id);
        CREATE INDEX IF NOT EXISTS idx_sale_transactions_business_date ON sale_transactions (business_date);
        CREATE INDEX IF NOT EXISTS idx_sale_transactions_member ON sale_transactions (member_id);
    END IF;
END $$;

-- ── Sale lines
DO $$
BEGIN
    IF to_regclass('public.sale_transaction_items') IS NOT NULL THEN
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS returned_quantity INTEGER;
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS list_price NUMERIC(10,2);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS price_overridden BOOLEAN;
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS bill_discount_share NUMERIC(10,2);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10,2);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
        ALTER TABLE sale_transaction_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
        UPDATE sale_transaction_items SET returned_quantity = 0 WHERE returned_quantity IS NULL;
        UPDATE sale_transaction_items SET price_overridden = FALSE WHERE price_overridden IS NULL;
        UPDATE sale_transaction_items SET bill_discount_share = 0 WHERE bill_discount_share IS NULL;
        UPDATE sale_transaction_items SET taxable_amount = total_amount WHERE taxable_amount IS NULL;
        CREATE INDEX IF NOT EXISTS idx_sale_transaction_items_txn ON sale_transaction_items (transaction_id);
    END IF;
END $$;

-- ── Cash movements ──────────────────────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.cash_movements') IS NOT NULL THEN
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
    END IF;
END $$;

-- ── Settings (one row per branch) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_settings (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    supervisor_pin_hash VARCHAR(255),
    require_supervisor_for_void BOOLEAN NOT NULL DEFAULT FALSE,
    require_supervisor_for_return BOOLEAN NOT NULL DEFAULT TRUE,
    require_supervisor_for_price_override BOOLEAN NOT NULL DEFAULT TRUE,
    require_supervisor_for_cash_out BOOLEAN NOT NULL DEFAULT FALSE,
    require_supervisor_for_reprint BOOLEAN NOT NULL DEFAULT FALSE,
    require_supervisor_for_force_close BOOLEAN NOT NULL DEFAULT TRUE,
    allow_price_override BOOLEAN NOT NULL DEFAULT TRUE,
    max_cashier_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
    tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    require_customer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_credit_sales BOOLEAN NOT NULL DEFAULT TRUE,
    require_cash_movement_category BOOLEAN NOT NULL DEFAULT FALSE,
    cash_in_categories TEXT,
    cash_out_categories TEXT,
    cash_variance_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
    denominations TEXT,
    auto_print_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    receipt_copies INTEGER NOT NULL DEFAULT 1,
    default_print_format VARCHAR(20) NOT NULL DEFAULT '80mm',
    open_drawer_on_cash BOOLEAN NOT NULL DEFAULT TRUE,
    idle_lock_minutes INTEGER NOT NULL DEFAULT 0,
    layout VARCHAR(20) NOT NULL DEFAULT 'classic',
    hide_category_panel BOOLEAN NOT NULL DEFAULT FALSE,
    show_product_images BOOLEAN NOT NULL DEFAULT TRUE,
    show_stock_on_cards BOOLEAN NOT NULL DEFAULT TRUE,
    receipt_share_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    z_report_access VARCHAR(20) NOT NULL DEFAULT 'SUPERVISOR',
    receipt_template TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_settings_branch ON pos_settings (branch_id);

-- ── Held (parked) sales ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_held_sales (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    pos_session_id BIGINT,
    hold_number VARCHAR(50),
    label VARCHAR(255),
    member_id BIGINT,
    member_name VARCHAR(255),
    cart_json TEXT NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    held_by VARCHAR(255),
    terminal_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_held_sales_branch ON pos_held_sales (branch_id);

-- ── Day close (Z-report snapshot) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_day_closes (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    business_date DATE NOT NULL,
    close_number VARCHAR(50),
    session_count INTEGER NOT NULL DEFAULT 0,
    invoice_count INTEGER NOT NULL DEFAULT 0,
    gross_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_discount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_returns NUMERIC(14,2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
    counted_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_variance NUMERIC(14,2) NOT NULL DEFAULT 0,
    summary_json TEXT,
    remarks TEXT,
    closed_by VARCHAR(255),
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_day_close_branch_date ON pos_day_closes (branch_id, business_date);

-- ── Returns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_sale_returns (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    return_number VARCHAR(50),
    transaction_id BIGINT NOT NULL,
    transaction_number VARCHAR(50),
    pos_session_id BIGINT,
    member_id BIGINT,
    member_name VARCHAR(255),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cogs NUMERIC(12,2) NOT NULL DEFAULT 0,
    refund_method VARCHAR(30),
    refund_breakdown TEXT,
    reason VARCHAR(255),
    notes TEXT,
    restock BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR(255),
    cashier_name VARCHAR(255),
    business_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_sale_returns_txn ON pos_sale_returns (transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_returns_session ON pos_sale_returns (pos_session_id);

CREATE TABLE IF NOT EXISTS pos_sale_return_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL,
    transaction_item_id BIGINT NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(255),
    product_sku VARCHAR(255),
    warehouse_id BIGINT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2),
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pos_sale_return_items_return ON pos_sale_return_items (return_id);

-- ── Credit settlements (customer pays down POS credit) ─────────────────────
CREATE TABLE IF NOT EXISTS pos_credit_payments (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    payment_number VARCHAR(50),
    member_id BIGINT NOT NULL,
    member_name VARCHAR(255),
    pos_session_id BIGINT,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    bank_account_code VARCHAR(50),
    bank_account_name VARCHAR(255),
    reference VARCHAR(255),
    notes TEXT,
    allocations TEXT,
    received_by VARCHAR(255),
    business_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_credit_payments_member ON pos_credit_payments (member_id);
CREATE INDEX IF NOT EXISTS idx_pos_credit_payments_session ON pos_credit_payments (pos_session_id);

-- ── Printers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_printers (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(20) NOT NULL DEFAULT 'BROWSER',
    system_printer_name VARCHAR(255),
    ip_address VARCHAR(64),
    port_number INTEGER,
    paper_size VARCHAR(10) NOT NULL DEFAULT '80mm',
    terminal_name VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    open_drawer BOOLEAN NOT NULL DEFAULT FALSE,
    auto_cut BOOLEAN NOT NULL DEFAULT TRUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_test_at TIMESTAMP,
    last_test_result VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_printers_branch ON pos_printers (branch_id);

-- ── Audit log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    action VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    reference_number VARCHAR(100),
    pos_session_id BIGINT,
    amount NUMERIC(12,2),
    details TEXT,
    performed_by VARCHAR(255),
    approved_by VARCHAR(255),
    terminal_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_audit_logs_branch_created ON pos_audit_logs (branch_id, created_at);
