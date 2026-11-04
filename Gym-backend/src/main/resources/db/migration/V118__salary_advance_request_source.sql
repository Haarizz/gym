-- Salary advances requested by staff/trainers from the mobile app.
-- requested_via: 'web' (entered by admin/HR) or 'app' (requested by the employee).
-- requested_by_user_id: who receives the approve/reject notification.
-- rejection_note: the approver's reason, kept out of remarks so the app can show it on its own.
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS requested_via VARCHAR(20) NOT NULL DEFAULT 'web';
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS requested_by_user_id BIGINT;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS rejection_note TEXT;
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee_status ON salary_advances (employee_id, status);
