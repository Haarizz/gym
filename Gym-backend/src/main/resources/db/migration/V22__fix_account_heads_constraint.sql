-- Drop the globally unique constraint on the code column
ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS uk_1k3bm2m00cs30hbnyil2ka8m7;
ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS account_heads_code_key;

-- Add a composite unique constraint on (branch_id, code)
ALTER TABLE account_heads ADD CONSTRAINT uk_account_heads_branch_code UNIQUE (branch_id, code);
