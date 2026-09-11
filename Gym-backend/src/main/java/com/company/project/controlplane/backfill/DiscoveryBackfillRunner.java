package com.company.project.controlplane.backfill;

import com.company.project.services.DiscoverySyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * One-time startup backfill that writes a global_branch_discovery row for every
 * branch in every ACTIVE tenant that doesn't already have one.
 *
 * This is needed to recover gyms provisioned before the self-invocation bug in
 * DiscoverySyncService.backfillForTenant was fixed: those gyms' main (default)
 * branch was never synced into global_branch_discovery, so it never appeared in
 * the mobile Centers listing.
 *
 * Idempotent: DiscoverySyncService.syncBranch uses findByTenantSlugAndBranchId →
 * orElseGet(new), so rows that already exist are simply updated in-place.
 *
 * Enable once with:
 *   --discovery.backfill.enabled=true
 * (or DISCOVERY_BACKFILL_ENABLED=true as an env var). After the app starts and
 * the backfill completes, restart without the flag — there is no harm in running
 * it again, but it adds startup latency proportional to the number of tenants.
 */
@Component
@ConditionalOnProperty(name = "discovery.backfill.enabled", havingValue = "true")
public class DiscoveryBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DiscoveryBackfillRunner.class);

    private final DiscoverySyncService discoverySyncService;

    public DiscoveryBackfillRunner(DiscoverySyncService discoverySyncService) {
        this.discoverySyncService = discoverySyncService;
    }

    @Override
    public void run(String... args) {
        log.info("DiscoveryBackfillRunner: starting global_branch_discovery backfill for all active tenants");
        discoverySyncService.backfillDiscoveryData();
        log.info("DiscoveryBackfillRunner: backfill complete");
    }
}
