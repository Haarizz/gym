-- Track 2 mobile-discovery gap fields identified against MemberCenters.tsx (Gym-app
-- web mockup): about/description text, establishment year, accepted payment modes /
-- BNPL, a display-facing tax rate, and freeform terms/policies. All branch-scoped,
-- matching the existing lat/lng/center_type/access_type/operating_hours fields added
-- in V37 for the same discovery feature.
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS established_year INTEGER,
ADD COLUMN IF NOT EXISTS accepted_payment_methods VARCHAR(255),
ADD COLUMN IF NOT EXISTS bnpl_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bnpl_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_and_policies TEXT;
