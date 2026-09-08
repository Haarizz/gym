ALTER TABLE members ADD COLUMN global_user_id BIGINT;
CREATE INDEX idx_members_global_user_id ON members(global_user_id);
