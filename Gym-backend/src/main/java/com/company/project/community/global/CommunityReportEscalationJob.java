package com.company.project.community.global;

import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.controlplane.community.store.CommunityModerationStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Moves reports to the platform queue when a gym hasn't dealt with them in
 * time, or when several different people reported the same content. Runs only
 * while the global Community is authoritative with reports switched on.
 */
@Component
public class CommunityReportEscalationJob {

    private static final Logger log = LoggerFactory.getLogger(CommunityReportEscalationJob.class);

    private final CommunityRolloutService rollout;
    private final CommunityModerationStore moderation;

    @Value("${community.reports.escalate-after-hours:72}")
    private int escalateAfterHours;

    @Value("${community.reports.escalate-distinct-reporters:3}")
    private int escalateDistinctReporters;

    public CommunityReportEscalationJob(CommunityRolloutService rollout, CommunityModerationStore moderation) {
        this.rollout = rollout;
        this.moderation = moderation;
    }

    @Scheduled(fixedDelayString = "${community.reports.escalation-interval-ms:900000}", initialDelay = 60_000)
    public void escalate() {
        try {
            if (rollout.killSwitchEngaged() || !rollout.state().isGlobalAuthority() || !rollout.state().reports()) {
                return;
            }
            List<Long> escalated = moderation.escalate(escalateAfterHours, escalateDistinctReporters);
            if (!escalated.isEmpty()) {
                log.info("community op=REPORT_ESCALATE count={} ids={}", escalated.size(), escalated);
            }
        } catch (RuntimeException e) {
            // The control plane may not have V6 yet (e.g. before deployment of the schema); never break the scheduler.
            log.debug("community report escalation skipped: {}", e.getMessage());
        }
    }
}
