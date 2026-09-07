-- Drop the globally unique constraint on the name column. Category names were
-- never actually global — ProductCategory is BranchAware (branch_id was added in
-- V19) and DataInitializer/ProductCategoryService seed a default category set
-- per branch — but the original @Column(unique = true) constraint predates
-- branch_id and was never migrated to match, so a second branch (or a re-seed
-- after the branchFilter went live) hits "duplicate key value violates unique
-- constraint" the moment it tries to create its own "Supplements" row, since
-- Postgres enforces uniqueness across all branches, not per branch. Same fix as
-- V22 for account_heads.code.
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS uk_fl075bwasjwsxybk4x174befx;
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;

-- Add a composite unique constraint on (branch_id, name). Guarded because a fresh
-- database already gets this exact, explicitly-named constraint from
-- ProductCategory's @Table(uniqueConstraints=...) via Hibernate's baseline DDL,
-- and Postgres has no native "ADD CONSTRAINT IF NOT EXISTS".
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_product_categories_branch_name') THEN
        ALTER TABLE product_categories ADD CONSTRAINT uk_product_categories_branch_name UNIQUE (branch_id, name);
    END IF;
END $$;
