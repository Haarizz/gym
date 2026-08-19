-- ============================================================
-- V19: Add branch_id to all branch-dependent entities
-- and migrate existing data to the default Main Branch
-- ============================================================

-- Add branch_id FK to all branch-dependent entities
ALTER TABLE members ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE training_streams ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE sale_transactions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE account_heads ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE payment_vouchers ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE contra_vouchers ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE journal_vouchers ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE wastage_returns ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE supplier_bills ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE staff_targets ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE addon_plans ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);

-- Also add branch_id to employees table for primary branch reference
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id);

-- Migrate all existing records to Main Branch
UPDATE members SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE attendance SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE receipts SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE expenses SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE leads SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE follow_ups SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE bookings SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE training_sessions SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE training_streams SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE sale_transactions SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE invoices SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE pos_sessions SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE assets SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE cost_centers SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE account_heads SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE receipt_vouchers SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE payment_vouchers SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE contra_vouchers SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE credit_notes SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE debit_notes SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE journal_vouchers SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE bank_reconciliations SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE referrals SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE staff_attendance SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE salary_payments SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE salary_advances SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE wastage_returns SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE purchase_orders SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE supplier_bills SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE staff_targets SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE promotions SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE community_posts SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE membership_plans SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE addon_plans SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE products SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE product_categories SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE product_stocks SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;
UPDATE employees SET branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN') WHERE branch_id IS NULL;

-- Migrate existing staff to staff_branches mapping
INSERT INTO staff_branches (staff_id, branch_id)
SELECT e.id, (SELECT id FROM branches WHERE branch_code = 'MAIN')
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM staff_branches sb WHERE sb.staff_id = e.id
);

-- Assign all existing users to Main Branch
INSERT INTO user_branches (user_id, branch_id)
SELECT u.id, (SELECT id FROM branches WHERE branch_code = 'MAIN')
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_branches ub WHERE ub.user_id = u.id
);

-- Create indexes for branch_id columns on high-traffic tables
CREATE INDEX IF NOT EXISTS idx_members_branch_id ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON attendance(branch_id);
CREATE INDEX IF NOT EXISTS idx_receipts_branch_id ON receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_branch_id ON membership_plans(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_transactions_branch_id ON sale_transactions(branch_id);
