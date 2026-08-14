ALTER TABLE assets
ADD COLUMN salvage_value NUMERIC(12,2);

UPDATE assets
SET salvage_value = 0.00
WHERE salvage_value IS NULL;

ALTER TABLE assets
ALTER COLUMN salvage_value SET DEFAULT 0.00;

ALTER TABLE assets
ALTER COLUMN salvage_value SET NOT NULL;