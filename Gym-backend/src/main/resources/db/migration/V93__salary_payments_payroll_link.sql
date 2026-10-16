-- V93__salary_payments_payroll_link.sql
-- Salary Payments pays an approved payroll run line by line. Each salary payment remembers
-- the payroll line it settled; each line remembers its payment. Paying a line settles that
-- employee's advance installments, deductions and commission, and the run moves
-- Approved -> Partially Paid -> Paid as its lines are paid.

ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS payroll_run_id BIGINT;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS payroll_run_line_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_salary_payments_payroll_line ON salary_payments (payroll_run_line_id);

ALTER TABLE payroll_run_lines ADD COLUMN IF NOT EXISTS salary_payment_id BIGINT;
ALTER TABLE payroll_run_lines ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
