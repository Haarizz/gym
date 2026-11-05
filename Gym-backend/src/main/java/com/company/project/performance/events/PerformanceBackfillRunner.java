package com.company.project.performance.events;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Fills performance_events from history once per database (plan §8 Phase 1), in the background
 * after startup so a plain restart is all a deploy needs. Marked done in
 * performance_engine_state; a database without the V121 tables yet is skipped and picked up on a
 * later start. Turn off with --performance.backfill.enabled=false.
 */
@Component
@ConditionalOnProperty(name = "performance.backfill.enabled", havingValue = "true", matchIfMissing = true)
public class PerformanceBackfillRunner {

    private static final Logger log = LoggerFactory.getLogger(PerformanceBackfillRunner.class);
    static final String DONE_KEY = "events_backfilled";

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEventRebuilder rebuilder;
    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final TransactionTemplate tx;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public PerformanceBackfillRunner(PerformanceEventRebuilder rebuilder, TenantRepository tenantRepository,
                                     TenantConnectionRepository tenantConnectionRepository,
                                     PlatformTransactionManager transactionManager) {
        this.rebuilder = rebuilder;
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.tx = new TransactionTemplate(transactionManager);
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        backfillCurrentDatabase("primary");
        if (!tenantRoutingEnabled) return;
        for (Tenant tenant : tenantRepository.findAll()) {
            if (tenant.getSlug() == null || tenantConnectionRepository.findByTenantId(tenant.getId()).isEmpty()) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                backfillCurrentDatabase(tenant.getSlug());
            } catch (Exception e) {
                log.warn("Performance backfill: skipped tenant '{}' — {}", tenant.getSlug(), e.getMessage());
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void backfillCurrentDatabase(String label) {
        Boolean pending;
        try {
            pending = tx.execute(s -> {
                Object events = em.createNativeQuery("SELECT CAST(to_regclass('performance_events') AS TEXT)").getSingleResult();
                if (events == null) throw new IllegalStateException("no performance_events table");
                // Local dev runs without Flyway (Hibernate creates the entity tables only).
                em.createNativeQuery("CREATE TABLE IF NOT EXISTS performance_engine_state (key VARCHAR(60) PRIMARY KEY, " +
                        "value TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW())").executeUpdate();
                return em.createNativeQuery("SELECT 1 FROM performance_engine_state WHERE key = :k")
                        .setParameter("k", DONE_KEY).getResultList().isEmpty();
            });
        } catch (Exception e) {
            log.info("Performance backfill: {} has no performance tables yet — skipped", label);
            return;
        }
        if (!Boolean.TRUE.equals(pending)) return;
        long started = System.currentTimeMillis();
        PerformanceEventRebuilder.Result result = rebuilder.rebuild(null, null, null);
        tx.executeWithoutResult(s -> em.createNativeQuery(
                        "INSERT INTO performance_engine_state (key, value, updated_at) VALUES (:k, :v, NOW()) " +
                        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()")
                .setParameter("k", DONE_KEY)
                .setParameter("v", result.sourcesChecked() + " sources, " + result.eventsWritten() + " events")
                .executeUpdate());
        log.info("Performance backfill for {}: {} sources checked, {} events written in {} ms", label,
                result.sourcesChecked(), result.eventsWritten(), System.currentTimeMillis() - started);
    }
}
