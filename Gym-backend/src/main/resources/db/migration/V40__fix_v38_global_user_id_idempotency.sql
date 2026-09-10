-- V38__add_global_user_id_to_members.sql has no IF NOT EXISTS guard. Every new
-- tenant database's provisioning flow (TenantProvisioningService.runSchemaAndMigrations)
-- runs a Hibernate ddl-auto=update pass FIRST (which already creates
-- members.global_user_id from Member.java's @Column mapping), then Flyway on top —
-- so V38's unconditional ALTER TABLE always fails with "column already exists" on
-- every brand-new gym, aborting provisioning before the owner login is ever created
-- (confirmed live: reproduced against a fresh tenant, RUN_MIGRATIONS failed with
-- exactly this error, before CREATE_OWNER ever ran). Same root cause V36 already
-- fixed for user_profiles.created_by/updated_by — V38 itself can't be edited in
-- place since it's already applied everywhere, so this is the follow-up repair,
-- guarded with IF NOT EXISTS so it's a no-op wherever ddl-auto already added it.
ALTER TABLE members ADD COLUMN IF NOT EXISTS global_user_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_members_global_user_id ON members(global_user_id);
