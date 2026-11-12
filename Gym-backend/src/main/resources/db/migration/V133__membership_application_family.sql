-- Family and Couple plans can now be applied for on the public Service Portfolios link.
-- The applicant is the family head; the rest of the household is stored here as a JSON
-- array (name, relationship, gender, date_of_birth, minor, phone, email) and becomes
-- the head's family members when the application is approved. NULL for one person.
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS family_members TEXT;
