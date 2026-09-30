-- Suppliers become branch-scoped (Supplier implements BranchAware + branchFilter).
-- Backfill for suppliers that have no branch yet:
--   * used by purchase orders / supplier bills / debit notes of exactly one branch
--     -> assigned to that branch;
--   * used by several branches -> kept on the lowest branch id, and a copy is created
--     for each other branch with that branch's documents repointed to its copy, so no
--     branch's documents reference a supplier from another branch (which
--     BranchSecurityListener would reject on read);
--   * unused -> the main branch (is_default, else the lowest branch id).
-- Idempotent: only rows with branch_id IS NULL are touched. The same script is also
-- applied at boot by TenantSupplierBranchBackfillRunner for tenant databases that
-- have not had tenant schema migrations rolled out.

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS branch_id BIGINT;

DO $$
DECLARE
    main_branch BIGINT;
    ref_tables TEXT[];
    ref_table TEXT;
    used_sql TEXT;
    copy_cols TEXT;
    sup RECORD;
    br BIGINT;
    first_branch BIGINT;
    new_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM suppliers WHERE branch_id IS NULL) THEN
        RETURN;
    END IF;

    SELECT id INTO main_branch FROM branches ORDER BY is_default DESC, id ASC LIMIT 1;
    IF main_branch IS NULL THEN
        RETURN;
    END IF;

    SELECT array_agg(t) INTO ref_tables
    FROM unnest(ARRAY['purchase_orders', 'supplier_bills', 'debit_notes']) AS t
    WHERE to_regclass(t) IS NOT NULL;

    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO copy_cols
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'suppliers'
      AND column_name NOT IN ('id', 'branch_id');

    FOR sup IN SELECT id FROM suppliers WHERE branch_id IS NULL ORDER BY id LOOP
        first_branch := NULL;

        IF ref_tables IS NOT NULL THEN
            SELECT string_agg(format('SELECT branch_id FROM %I WHERE supplier_id = %s', t, sup.id), ' UNION ')
            INTO used_sql
            FROM unnest(ref_tables) AS t;

            FOR br IN EXECUTE 'SELECT DISTINCT branch_id FROM (' || used_sql || ') used '
                           || 'WHERE branch_id IS NOT NULL ORDER BY branch_id' LOOP
                IF first_branch IS NULL THEN
                    first_branch := br;
                    UPDATE suppliers SET branch_id = br WHERE id = sup.id;
                ELSE
                    EXECUTE format('INSERT INTO suppliers (%s, branch_id) SELECT %s, $1 FROM suppliers WHERE id = $2 RETURNING id',
                                   copy_cols, copy_cols)
                        INTO new_id USING br, sup.id;
                    FOREACH ref_table IN ARRAY ref_tables LOOP
                        EXECUTE format('UPDATE %I SET supplier_id = $1 WHERE supplier_id = $2 AND branch_id = $3', ref_table)
                            USING new_id, sup.id, br;
                    END LOOP;
                END IF;
            END LOOP;
        END IF;

        IF first_branch IS NULL THEN
            UPDATE suppliers SET branch_id = main_branch WHERE id = sup.id;
        END IF;
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON suppliers (branch_id);
