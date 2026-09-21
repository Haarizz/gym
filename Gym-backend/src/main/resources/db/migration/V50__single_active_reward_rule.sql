DO $$
DECLARE
    active_count integer;
BEGIN
    SELECT COUNT(*) INTO active_count FROM referral_reward_rules WHERE is_active = true;
    IF active_count > 1 THEN
        RAISE EXCEPTION 'Multiple active reward rules found (%). Cannot automatically determine which one to preserve. Please resolve manually by deactivating all but one rule before applying this migration.', active_count;
    END IF;
END $$;

CREATE UNIQUE INDEX idx_single_active_rule ON referral_reward_rules (is_active) WHERE is_active = true;
