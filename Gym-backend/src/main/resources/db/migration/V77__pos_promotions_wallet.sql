-- POS: discount codes (promotion / referral coupon codes), promotions picked at the till,
-- and member-wallet tenders. The code/promotion discount is stored apart from the
-- cashier's manual bill discount so reports can tell them apart. Idempotent.
DO $$
BEGIN
    IF to_regclass('public.sale_transactions') IS NOT NULL THEN
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS discount_code VARCHAR(60);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS code_discount_amount NUMERIC(12, 2);
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS promotion_id BIGINT;
        ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS promotion_name VARCHAR(200);
    END IF;
END $$;
