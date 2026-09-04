package com.company.project.controlplane.backfill;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Gym;
import com.company.project.repositories.GymRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time, manually-triggered copy of gyms (primary DB) -> tenants (control-plane
 * DB). Disabled by default; run once with:
 *   --control-plane.backfill.enabled=true
 * (or CONTROL_PLANE_BACKFILL_ENABLED=true as an env var). Idempotent: skips any gym
 * whose slug already exists as a tenant, so it is safe to re-run for incremental
 * gyms created after the initial backfill (full incremental sync automation is
 * deferred to a later phase — this is just the manual trigger).
 * Does NOT touch tenant_connections/tenant_stats/tenant_provisioning_log/platform_users
 * — those stay empty until a later phase populates them.
 */
@Component
@ConditionalOnProperty(name = "control-plane.backfill.enabled", havingValue = "true")
public class TenantBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantBackfillRunner.class);

    private final GymRepository gymRepository;
    private final TenantRepository tenantRepository;

    public TenantBackfillRunner(GymRepository gymRepository, TenantRepository tenantRepository) {
        this.gymRepository = gymRepository;
        this.tenantRepository = tenantRepository;
    }

    @Override
    @Transactional("controlPlaneTransactionManager")
    public void run(String... args) {
        int copied = 0;
        for (Gym gym : gymRepository.findAll()) {
            if (tenantRepository.existsBySlug(gym.getSlug())) {
                continue;
            }
            Tenant tenant = new Tenant(gym.getName(), gym.getSlug());
            tenant.setStatus(gym.getStatus());
            tenant.setOwnerUserId(gym.getOwnerUserId());
            tenantRepository.save(tenant);
            copied++;
        }
        log.info("TenantBackfillRunner: copied {} new tenant(s) from gyms", copied);
    }
}
