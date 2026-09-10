-- One-time manual backfill: run once against EACH already-provisioned tenant
-- database (not a Flyway migration — permissions/role_permissions are seeded
-- app data, not schema, and every tenant already has rows there so
-- DataInitializer.seedDefaultRolePermissions's "skip if role already has any
-- permissions" guard silently no-ops for all of them).
--
-- Prerequisite: V39__member_payment_approval.sql must already be applied to
-- the target tenant database (e.g. via TenantMigrationRunner —
-- run the backend once with -Dtenant.schema-migration.enabled=true) before
-- running this, since MEMBERS_APPROVE is meaningless without the
-- approval_status columns it gates access to.
--
-- Safe to re-run: every insert is guarded by a NOT EXISTS check.
-- Any NEW tenant provisioned after this change gets MEMBERS_APPROVE
-- automatically via TenantProvisioningService — this script is only for
-- tenants that existed before it.

INSERT INTO permissions (created_at, action, description, module, permission_key)
SELECT now(), 'APPROVE', 'MEMBERS - APPROVE', 'MEMBERS', 'MEMBERS_APPROVE'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'MEMBERS_APPROVE');

INSERT INTO role_permissions (created_at, permission_id, role_id)
SELECT now(), p.id, r.id
FROM permissions p, roles r
WHERE p.permission_key = 'MEMBERS_APPROVE'
  AND r.role_name IN ('ADMIN', 'MANAGER', 'RECEPTIONIST')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.permission_id = p.id AND rp.role_id = r.id
  );
