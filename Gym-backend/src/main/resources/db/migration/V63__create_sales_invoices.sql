-- Back-office Sales Invoice (Sales & Purchases › Sales Invoice), ported from
-- BillBull's Sales Invoice. Direct sales only — to a member or a walk-in
-- customer; there are no sales orders / delivery notes behind it. Confirming an
-- invoice deducts stock per line warehouse (when Sales Settings › Stock Check is
-- on) and posts the receivable; payments are recorded against it afterwards.
CREATE TABLE IF NOT EXISTS sales_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    invoice_date DATE,
    due_date DATE,
    payment_terms VARCHAR(30),
    reference VARCHAR(255),
    salesperson VARCHAR(255),
    -- WALK_IN or MEMBER
    customer_type VARCHAR(20) NOT NULL DEFAULT 'WALK_IN',
    member_id BIGINT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_trn VARCHAR(50),
    -- DRAFT, CONFIRMED, CANCELLED
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    -- UNPAID, PARTIAL, PAID
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    prices_include_tax BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    footer_discount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(12, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    delivery_charge NUMERIC(12, 2) DEFAULT 0,
    round_off NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    total_cogs NUMERIC(12, 2) DEFAULT 0,
    -- Whether confirming actually took stock out, so cancelling restores exactly
    -- that even if the Stock Check setting was changed in between.
    stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method VARCHAR(50),
    payment_breakdown TEXT,
    notes TEXT,
    internal_notes TEXT,
    branch_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_branch ON sales_invoices (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_member ON sales_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices (status);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES sales_invoices (id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255),
    product_sku VARCHAR(100),
    unit_of_measure VARCHAR(30),
    warehouse_id BIGINT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) DEFAULT 0,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    footer_discount_share NUMERIC(12, 2) DEFAULT 0,
    tax_percent NUMERIC(5, 2) DEFAULT 0,
    taxable_amount NUMERIC(12, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    cost_price NUMERIC(12, 2) DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice ON sales_invoice_items (invoice_id);
