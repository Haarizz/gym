package com.company.project.controlplane.backfill;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.BranchRatingSummary;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.BranchRatingSummaryRepository;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Recomputes branch_rating_summaries from every gym's reviews table. GymReviewService
 * keeps a branch's row current as reviews are saved, but that is best-effort and
 * misses reviews saved before the summary existed — this catches everything up.
 *
 * Runs in the background on every startup, once the app is ready. Read-only against
 * tenant databases; a full recompute, so it is always safe to repeat. Turn off with
 *   --branch-rating-summary.backfill.enabled=false
 */
@Component
@ConditionalOnProperty(name = "branch-rating-summary.backfill.enabled", havingValue = "true", matchIfMissing = true)
public class BranchRatingSummaryBackfillRunner {

    private static final Logger log = LoggerFactory.getLogger(BranchRatingSummaryBackfillRunner.class);

    private static final String COUNTS_SQL =
            "SELECT b.id AS branch_id, b.branch_name, r.rating, COUNT(r.id) AS n, "
                    + "MAX(COALESCE(r.updated_at, r.created_at)) AS last_at "
                    + "FROM branches b JOIN reviews r ON r.branch_id = b.id "
                    + "GROUP BY b.id, b.branch_name, r.rating";

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final BranchRatingSummaryRepository summaryRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final DataSource primaryDataSource;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    public BranchRatingSummaryBackfillRunner(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            BranchRatingSummaryRepository summaryRepository,
            TenantDataSourceRegistry tenantDataSourceRegistry,
            @Qualifier("primaryDataSource") DataSource primaryDataSource) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.summaryRepository = summaryRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.primaryDataSource = primaryDataSource;
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        int branches = 0;
        if (!tenantRoutingEnabled) {
            branches += recompute(defaultTenantSlug, primaryDataSource);
        } else {
            for (Tenant tenant : tenantRepository.findAll()) {
                if (tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) {
                    continue;
                }
                try {
                    branches += recompute(tenant.getSlug(), tenantDataSourceRegistry.getDataSource(tenant.getSlug()));
                } catch (Exception e) {
                    log.warn("BranchRatingSummaryBackfillRunner: skipped tenant '{}' — {}", tenant.getSlug(), e.getMessage());
                }
            }
        }
        log.info("BranchRatingSummaryBackfillRunner: refreshed {} branch rating summar(ies)", branches);
    }

    private int recompute(String tenantSlug, DataSource dataSource) {
        Map<Long, long[]> counts = new HashMap<>();
        Map<Long, String> names = new HashMap<>();
        Map<Long, LocalDateTime> lastAt = new HashMap<>();
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(COUNTS_SQL)) {
            while (rs.next()) {
                long branchId = rs.getLong("branch_id");
                int rating = rs.getInt("rating");
                if (rating < 1 || rating > 5) continue;
                counts.computeIfAbsent(branchId, k -> new long[5])[rating - 1] = rs.getLong("n");
                names.put(branchId, rs.getString("branch_name"));
                Timestamp ts = rs.getTimestamp("last_at");
                if (ts != null) lastAt.merge(branchId, ts.toLocalDateTime(), (a, b) -> a.isAfter(b) ? a : b);
            }
        } catch (Exception e) {
            log.warn("BranchRatingSummaryBackfillRunner: could not read reviews of tenant '{}' — {}", tenantSlug, e.getMessage());
            return 0;
        }

        int refreshed = 0;
        // Rows for branches whose reviews are all gone drop back to zero.
        for (BranchRatingSummary existing : summaryRepository.findByTenantSlug(tenantSlug)) {
            if (!counts.containsKey(existing.getBranchId())) {
                existing.setCounts(new long[5]);
                existing.setLastReviewAt(null);
                summaryRepository.save(existing);
            }
        }
        for (Map.Entry<Long, long[]> e : counts.entrySet()) {
            try {
                BranchRatingSummary summary = summaryRepository.findByTenantSlugAndBranchId(tenantSlug, e.getKey())
                        .orElseGet(() -> new BranchRatingSummary(tenantSlug, e.getKey()));
                summary.setCounts(e.getValue());
                summary.setBranchName(names.get(e.getKey()));
                summary.setLastReviewAt(lastAt.get(e.getKey()));
                summaryRepository.save(summary);
                refreshed++;
            } catch (Exception ex) {
                log.warn("Skipped rating summary for branch {} of tenant '{}' — {}", e.getKey(), tenantSlug, ex.getMessage());
            }
        }
        return refreshed;
    }
}
