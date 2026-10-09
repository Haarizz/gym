package com.company.project.community.global.rollout;

import com.company.project.community.global.identity.CommunityActor;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;

/**
 * Grants COMMUNITY_MODERATE to ADMIN and MANAGER in every gym database.
 *
 * Needed because DataInitializer only seeds the primary database and tenant
 * databases only receive permissions when first provisioned, so existing
 * gyms would otherwise have no moderators. Idempotent (INSERT ... ON CONFLICT /
 * WHERE NOT EXISTS), dry-run by default, and audited. It WRITES to gym
 * databases, so running it for real in production is a gated rollout step.
 */
@Service
public class CommunityPermissionSyncService {

    static final String PERMISSION = CommunityActor.MODERATE_PERMISSION;
    static final List<String> ROLES = List.of("ADMIN", "MANAGER");

    public record GymResult(String gym, boolean permissionExisted, List<String> rolesGranted, String error) {}

    private final DataSource primaryDataSource;
    private final TenantRepository tenantRepository;
    private final TenantDataSourceRegistry registry;
    private final CommunityRolloutStore rolloutStore;

    public CommunityPermissionSyncService(@Qualifier("primaryDataSource") DataSource primaryDataSource,
                                          TenantRepository tenantRepository, TenantDataSourceRegistry registry,
                                          CommunityRolloutStore rolloutStore) {
        this.primaryDataSource = primaryDataSource;
        this.tenantRepository = tenantRepository;
        this.registry = registry;
        this.rolloutStore = rolloutStore;
    }

    public List<GymResult> sync(boolean dryRun, String changedBy, String reason) {
        List<GymResult> results = new ArrayList<>();
        results.add(syncOne("primary", primaryDataSource, dryRun));
        for (Tenant tenant : tenantRepository.findAll()) {
            if (!registry.hasConnection(tenant.getSlug())) {
                continue;
            }
            try {
                results.add(syncOne("tenant:" + tenant.getSlug(), registry.getDataSource(tenant.getSlug()), dryRun));
            } catch (RuntimeException e) {
                results.add(new GymResult("tenant:" + tenant.getSlug(), false, List.of(), e.getClass().getSimpleName()));
            }
        }
        if (!dryRun) {
            long granted = results.stream().mapToLong(r -> r.rolesGranted().size()).sum();
            rolloutStore.audit(changedBy, "community_moderate_permission_sync", null,
                    granted + " role grants across " + results.size() + " databases", reason);
        }
        return results;
    }

    GymResult syncOne(String name, DataSource ds, boolean dryRun) {
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        Integer existing = jdbc.queryForObject("SELECT count(*) FROM permissions WHERE permission_key = ?", Integer.class, PERMISSION);
        boolean existed = existing != null && existing > 0;
        List<String> granted = new ArrayList<>();
        if (!dryRun && !existed) {
            jdbc.update("INSERT INTO permissions (permission_key, module, action, description, created_at) "
                    + "VALUES (?, 'COMMUNITY', 'MODERATE', 'COMMUNITY - MODERATE', now()) ON CONFLICT (permission_key) DO NOTHING", PERMISSION);
        }
        for (String role : ROLES) {
            Integer missing = jdbc.queryForObject("SELECT count(*) FROM roles r WHERE r.role_name = ? AND NOT EXISTS ("
                    + "SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id "
                    + "WHERE rp.role_id = r.id AND p.permission_key = ?)", Integer.class, role, PERMISSION);
            if (missing == null || missing == 0) {
                continue;
            }
            if (!dryRun) {
                // role_permissions has no guaranteed unique constraint (see TenantProvisioningService), so guard explicitly.
                jdbc.update("INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p "
                        + "WHERE r.role_name = ? AND p.permission_key = ? AND NOT EXISTS (SELECT 1 FROM role_permissions x "
                        + "WHERE x.role_id = r.id AND x.permission_id = p.id)", role, PERMISSION);
            }
            granted.add(role);
        }
        return new GymResult(name, existed, granted, null);
    }
}
