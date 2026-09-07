-- V24__user_profile.sql created user_profiles with only created_at/updated_at,
-- but UserProfile extends BaseEntity, which also declares created_by/updated_by
-- (populated by Spring Data's AuditingEntityListener via @CreatedBy/@LastModifiedBy).
-- Local dev never surfaced this gap because its primary DB gets this table from
-- Hibernate's ddl-auto=update, which adds every BaseEntity column automatically —
-- but tenant databases get it from this raw SQL file via Flyway, so every tenant
-- (confirmed live: acme-fitness, power-gym, test-gym) ended up with a
-- user_profiles table missing two columns Hibernate's generated SELECT always
-- asks for, breaking tenant-owner login the moment it tries to load the user's
-- profile ("column up1_0.created_by does not exist"). V24 itself can't be edited
-- in place — it's already applied everywhere, including via this same repair
-- path — so this adds the missing columns as a follow-up, guarded with IF NOT
-- EXISTS so it's a no-op wherever ddl-auto already added them.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
