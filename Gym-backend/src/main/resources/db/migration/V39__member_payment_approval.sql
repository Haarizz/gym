ALTER TABLE members ADD COLUMN approval_status VARCHAR(20);
ALTER TABLE members ADD COLUMN approved_by VARCHAR(255);
ALTER TABLE members ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE members ADD COLUMN rejection_reason TEXT;
CREATE INDEX idx_members_approval_status ON members(approval_status);

ALTER TABLE receipts ADD COLUMN approval_status VARCHAR(20);
ALTER TABLE receipts ADD COLUMN approved_by VARCHAR(255);
ALTER TABLE receipts ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE receipts ADD COLUMN rejection_reason TEXT;
