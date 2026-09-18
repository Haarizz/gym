-- GYMOS_EDIT is new on the GYMOS module (PermissionCatalog.ACTIONS_VIEW_EDIT,
-- upgraded from ACTIONS_VIEW_ONLY) so Module Management's enable/disable
-- actions have something to require. Same reasoning as
-- V41__backfill_members_approve_permission.sql: DataInitializer only seeds
-- the default/primary DataSource, so already-provisioned tenant databases
-- never see a newly added permission key without an explicit backfill here.
INSERT INTO permissions (created_at, action, description, module, permission_key)
SELECT now(), 'EDIT', 'GYMOS - EDIT', 'GYMOS', 'GYMOS_EDIT'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'GYMOS_EDIT');

INSERT INTO role_permissions (created_at, permission_id, role_id)
SELECT now(), p.id, r.id
FROM permissions p, roles r
WHERE p.permission_key = 'GYMOS_EDIT'
  AND r.role_name IN ('ADMIN', 'MANAGER')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.permission_id = p.id AND rp.role_id = r.id
  );
