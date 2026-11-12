package com.company.project.performance.events;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** Short "what / who" labels for ledger rows (the mobile transaction list), one query per source type. */
@Component
@Transactional(readOnly = true)
public class SourceLabels {

    public record Label(String title, String person) {}

    private static final Map<String, String> SQL = Map.of(
            "receipt", "SELECT id, COALESCE(plan_name, receipt_no), member_name FROM receipts WHERE id IN (:ids)",
            "sale", "SELECT id, transaction_number, member_name FROM sale_transactions WHERE id IN (:ids)",
            "lead", "SELECT id, TRIM(first_name || ' ' || COALESCE(last_name, '')), NULL FROM leads WHERE id IN (:ids)",
            "session", "SELECT id, name, NULL FROM training_sessions WHERE id IN (:ids)",
            "enrolment", "SELECT e.id, e.package_name, m.name FROM package_enrolments e " +
                    "LEFT JOIN members m ON m.id = e.member_id WHERE e.id IN (:ids)");

    @PersistenceContext
    private EntityManager em;

    /** type → id → label. */
    @SuppressWarnings("unchecked")
    public Map<String, Map<Long, Label>> describe(Collection<PerformanceEvent> events) {
        Map<String, Set<Long>> ids = new HashMap<>();
        for (PerformanceEvent e : events) ids.computeIfAbsent(e.getSourceType(), k -> new HashSet<>()).add(e.getSourceId());
        Map<String, Map<Long, Label>> out = new HashMap<>();
        ids.forEach((type, set) -> {
            String sql = SQL.get(type);
            if (sql == null || set.isEmpty()) return;
            Map<Long, Label> labels = new HashMap<>();
            for (Object[] r : (List<Object[]>) em.createNativeQuery(sql).setParameter("ids", set).getResultList()) {
                labels.put(((Number) r[0]).longValue(), new Label(r[1] != null ? r[1].toString() : null, r[2] != null ? r[2].toString() : null));
            }
            out.put(type, labels);
        });
        return out;
    }
}
