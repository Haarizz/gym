ALTER TABLE assets
ADD COLUMN useful_life_months INTEGER;

UPDATE assets
SET useful_life_months = 0
WHERE useful_life_months IS NULL;

ALTER TABLE assets
ALTER COLUMN useful_life_months SET DEFAULT 0;

ALTER TABLE assets
ALTER COLUMN useful_life_months SET NOT NULL;