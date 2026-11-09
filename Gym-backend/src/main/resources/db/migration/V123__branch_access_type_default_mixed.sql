-- Branch "Access Type" defaults to Mixed. Blank was already treated as Mixed by
-- BranchAccessPolicy, but Branch Settings showed an empty "Select access type".
-- Store it explicitly for existing branches and for any row inserted without one
-- (e.g. the default branch V18 seeds for a new gym).
UPDATE branches SET access_type = 'Mixed' WHERE access_type IS NULL OR TRIM(access_type) = '';

ALTER TABLE branches ALTER COLUMN access_type SET DEFAULT 'Mixed';
