-- Drop the globally unique constraint on the code column
ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS uk_1k3bm2m00cs30hbnyil2ka8m7;
ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS account_heads_code_key;

-- Add a composite unique constraint on (branch_id, code). Guarded because a fresh
-- database already gets this exact, explicitly-named constraint from AccountHead's
-- @Table(uniqueConstraints=...) via Hibernate's baseline DDL, and Postgres has no
-- native "ADD CONSTRAINT IF NOT EXISTS".
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_account_heads_branch_code') THEN
        ALTER TABLE account_heads ADD CONSTRAINT uk_account_heads_branch_code UNIQUE (branch_id, code);
    END IF;
END $$;
