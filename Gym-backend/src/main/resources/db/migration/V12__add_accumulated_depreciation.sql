ALTER TABLE assets
ADD COLUMN accumulated_depreciation NUMERIC(12,2);

UPDATE assets
SET accumulated_depreciation = 0.00
WHERE accumulated_depreciation IS NULL;

ALTER TABLE assets
ALTER COLUMN accumulated_depreciation SET DEFAULT 0.00;

ALTER TABLE assets
ALTER COLUMN accumulated_depreciation SET NOT NULL;