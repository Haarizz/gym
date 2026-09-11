-- MEMBERS_APPROVE (Approvals tab — mobile Cash/Credit/Mixed purchases awaiting
-- reception approval, see MobileDiscoveryController/ApprovalsController) is new
-- on the MEMBERS module (PermissionCatalog.ACTIONS_FULL_APPROVE). DataInitializer
-- seeds the permission catalog and default role grants on JVM startup, but that
-- only ever runs against the primary/default DataSource — under tenant routing
-- (tenant.routing.enabled=true) every already-provisioned tenant database is
-- untouched by it, so a tenant provisioned before this permission existed never
-- gets it. Flyway migrations, unlike DataInitializer, DO get rolled out to every
-- tenant (at provisioning time, and to already-provisioned tenants via
-- TenantMigrationRunner), so the backfill belongs here instead.
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
