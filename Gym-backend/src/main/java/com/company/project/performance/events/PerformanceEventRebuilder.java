package com.company.project.performance.events;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Re-derives the ledger from the source tables (plan §4.2): the initial backfill of history,
 * and a repair tool if a write was ever missed. Safe to run any time — reconciling only writes
 * differences, so a correct ledger is left as it is.
 */
@Service
public class PerformanceEventRebuilder {

    private static final int BATCH = 200;

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEventRecorder recorder;

    public PerformanceEventRebuilder(PerformanceEventRecorder recorder) {
        this.recorder = recorder;
    }

    public record Result(int sourcesChecked, int eventsWritten) {}

    /** branchId / from / to may be null (no limit). */
    public Result rebuild(Long branchId, LocalDateTime from, LocalDateTime to) {
        int checked = 0;
        int written = 0;
        for (String type : recorder.sourceTypes()) {
            Set<Long> ids = new TreeSet<>(recorder.deriver(type).sourceIds(branchId, from, to));
            ids.addAll(ledgerSourceIds(type, branchId, from, to));
            List<Long> all = new ArrayList<>(ids);
            for (int i = 0; i < all.size(); i += BATCH) {
                List<Long> batch = all.subList(i, Math.min(all.size(), i + BATCH));
                written += recorder.reconcileBatchInNewTransaction(type, batch);
                checked += batch.size();
            }
        }
        return new Result(checked, written);
    }

    /** Rows already in the ledger: a source that no longer qualifies still has to be reversed. */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Long> ledgerSourceIds(String type, Long branchId, LocalDateTime from, LocalDateTime to) {
        StringBuilder sql = new StringBuilder("SELECT DISTINCT source_id FROM performance_events WHERE source_type = :type");
        if (branchId != null) sql.append(" AND branch_id = :branch");
        if (from != null) sql.append(" AND occurred_at >= :from");
        if (to != null) sql.append(" AND occurred_at < :to");
        Query q = em.createNativeQuery(sql.toString()).setParameter("type", type);
        if (branchId != null) q.setParameter("branch", branchId);
        if (from != null) q.setParameter("from", from);
        if (to != null) q.setParameter("to", to);
        return ((List<Number>) q.getResultList()).stream().map(Number::longValue).toList();
    }
}
