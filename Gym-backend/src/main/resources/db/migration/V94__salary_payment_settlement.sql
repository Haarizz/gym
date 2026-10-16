-- V94__salary_payment_settlement.sql
-- A month paid without payroll settles the same items as payroll (advance installments,
-- deductions, approved commission). Every salary payment keeps what it covered, and a
-- deduction remembers the month it was last taken so the same month is never deducted twice.
-- IF NOT EXISTS: Hibernate (ddl-auto=update) may already have added them on the primary DB.

ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS settlement_json TEXT;
ALTER TABLE employee_deductions ADD COLUMN IF NOT EXISTS last_applied_month DATE;
