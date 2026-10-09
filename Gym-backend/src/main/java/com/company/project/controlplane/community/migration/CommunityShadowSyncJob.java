package com.company.project.controlplane.community.migration;

import com.company.project.community.global.rollout.CommunityRolloutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The shadow period: while the legacy store is still authoritative, keep the
 * global replica current (legacy_delta_sync) and prove it matches
 * (shadow_compare) on a schedule. Results land in community_migration_runs; the
 * global data is never exposed to users during this period (the database
 * forbids global reads while authority is LEGACY).
 */
@Component
public class CommunityShadowSyncJob {

    private static final Logger log = LoggerFactory.getLogger(CommunityShadowSyncJob.class);

    private final CommunityRolloutService rollout;
    private final LegacyCommunityBackfillService backfill;
    private final CommunityReconciliationService reconciliation;

    public CommunityShadowSyncJob(CommunityRolloutService rollout, LegacyCommunityBackfillService backfill,
                                  CommunityReconciliationService reconciliation) {
        this.rollout = rollout;
        this.backfill = backfill;
        this.reconciliation = reconciliation;
    }

    @Scheduled(fixedDelayString = "${community.shadow-sync.interval-ms:900000}", initialDelay = 120_000)
    public void sync() {
        try {
            if (rollout.killSwitchEngaged()) {
                return;
            }
            var state = rollout.state();
            if (state.isGlobalAuthority() || !"OPEN".equals(state.writeMode())) {
                return;   // after cutover, or during the cutover freeze (operators run FINAL explicitly)
            }
            if (state.legacyDeltaSync()) {
                backfill.run("DELTA", "system:shadow-sync");
            }
            if (state.shadowCompare()) {
                var result = reconciliation.run("DELTA", "system:shadow-compare");
                if (!"PASS".equals(result.status())) {
                    log.warn("community shadow comparison run={} status={} differences={}",
                            result.runId(), result.status(), result.differences());
                }
            }
        } catch (RuntimeException e) {
            // Includes "control plane not migrated yet" before V6 is deployed; never break the scheduler.
            log.debug("community shadow sync skipped: {}", e.getMessage());
        }
    }
}
