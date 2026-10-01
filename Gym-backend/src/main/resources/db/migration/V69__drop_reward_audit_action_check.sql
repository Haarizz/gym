-- V69__drop_reward_audit_action_check.sql
-- Tenant databases are bootstrapped by a Hibernate ddl-auto=update pass before
-- Flyway runs, so reward_audit_logs there was created by Hibernate (V6's
-- CREATE TABLE IF NOT EXISTS is a no-op), and Hibernate 6.2+ adds
-- CHECK (action IN (...)) for @Enumerated(STRING) columns, frozen to the enum
-- values at provisioning time. RewardAuditAction.RESTORED (written when a
-- cancelled booking gives its Reward Pass back) is not in that list, so the
-- insert fails and the whole cancellation rolls back. The enum is validated in
-- Java; drop the database-side copy rather than re-listing values that would go
-- stale again. No-op where the table or constraint doesn't exist (e.g. the
-- primary DB, where V6 created the table without one).

DO $$
DECLARE
    con RECORD;
BEGIN
    IF to_regclass('reward_audit_logs') IS NULL THEN
        RETURN;
    END IF;
    FOR con IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'reward_audit_logs'::regclass
          AND c.contype = 'c'
          AND a.attname = 'action'
    LOOP
        EXECUTE format('ALTER TABLE reward_audit_logs DROP CONSTRAINT %I', con.conname);
    END LOOP;
END $$;
