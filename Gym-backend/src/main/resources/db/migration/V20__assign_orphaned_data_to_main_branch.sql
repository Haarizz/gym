-- ============================================================
-- V20: Ensure all null branch_ids are assigned to the primary branch
-- to prevent data from bleeding across branches.
-- ============================================================

DO $$
DECLARE
    default_branch_id BIGINT;
BEGIN
    -- Try to get MAIN branch
    SELECT id INTO default_branch_id FROM branches WHERE branch_code = 'MAIN' LIMIT 1;
    
    -- If MAIN doesn't exist, just get the first one (oldest)
    IF default_branch_id IS NULL THEN
        SELECT id INTO default_branch_id FROM branches ORDER BY id ASC LIMIT 1;
    END IF;

    -- If we have a branch, update everything that is currently unassigned
    IF default_branch_id IS NOT NULL THEN
        UPDATE members SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE attendance SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE receipts SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE expenses SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE leads SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE follow_ups SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE bookings SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE training_sessions SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE training_streams SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE sale_transactions SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE invoices SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE pos_sessions SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE assets SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE cost_centers SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE account_heads SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE receipt_vouchers SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE payment_vouchers SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE contra_vouchers SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE credit_notes SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE debit_notes SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE journal_vouchers SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE bank_reconciliations SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE referrals SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE staff_attendance SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE salary_payments SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE salary_advances SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE wastage_returns SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE purchase_orders SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE supplier_bills SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE staff_targets SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE promotions SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE community_posts SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE membership_plans SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE addon_plans SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE products SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE product_categories SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE product_stocks SET branch_id = default_branch_id WHERE branch_id IS NULL;
        UPDATE employees SET branch_id = default_branch_id WHERE branch_id IS NULL;
    END IF;
END $$;
