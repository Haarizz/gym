-- Membership applications can now also be raised by staff from the Service Portfolios
-- page (Choose Plan → Register as New Member) for a walk-in, not only by a visitor on
-- the public share link. Both land in Approvals → Applications; approval creates the
-- member either way. created_by (from BaseEntity auditing) records the staff user.
--
-- SHARE_LINK = public /join link (visitor applied themselves)
-- DESK       = raised by staff at the gym (always paid cash at reception)
ALTER TABLE membership_applications
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'SHARE_LINK';

-- Captured by the desk form and carried onto the member on approval.
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS reg_doc_number VARCHAR(100);
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
