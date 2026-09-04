-- Add the new column
ALTER TABLE account_heads
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

ALTER TABLE journal_vouchers
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

-- Populate existing records
UPDATE account_heads
SET currency_code = 'AED'
WHERE currency_code IS NULL;

UPDATE journal_vouchers
SET currency_code = 'AED'
WHERE currency_code IS NULL;

-- Make the column mandatory for future records
ALTER TABLE account_heads
ALTER COLUMN currency_code SET DEFAULT 'AED';

ALTER TABLE account_heads
ALTER COLUMN currency_code SET NOT NULL;

ALTER TABLE journal_vouchers
ALTER COLUMN currency_code SET DEFAULT 'AED';

ALTER TABLE journal_vouchers
ALTER COLUMN currency_code SET NOT NULL;