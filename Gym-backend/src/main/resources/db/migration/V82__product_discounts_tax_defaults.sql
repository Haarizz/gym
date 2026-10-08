-- Product discounts and branch tax defaults (BillBull parity):
--  * products.allow_discount / max_discount_percent — the sales discount a product carries: it is
--    pre-filled on POS and Sales Invoice lines and is that product's limit (above it needs a
--    supervisor at the POS). allow_discount = false: no discount on the product at all.
--  * products.purchase_discount_percent — pre-filled on Purchase Order / Supplier Bill lines.
--  * products.use_default_tax — the line tax follows the branch default (Settings › Tax
--    Configuration: sales tax for sales, purchase tax for purchases); false = the product's own
--    tax_rate overrides it. Existing products follow the branch default.
-- Idempotent.

DO $$
BEGIN
    IF to_regclass('public.products') IS NOT NULL THEN
        ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_discount BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS use_default_tax BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;
