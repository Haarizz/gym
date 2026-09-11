ALTER TABLE members ADD COLUMN IF NOT EXISTS global_user_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_members_global_user_id ON members(global_user_id);
