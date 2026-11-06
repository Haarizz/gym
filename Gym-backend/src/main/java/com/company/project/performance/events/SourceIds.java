package com.company.project.performance.events;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.time.LocalDateTime;
import java.util.List;

/** Builds the optional branch / date limits on a deriver's id query. */
final class SourceIds {

    private SourceIds() {}

    @SuppressWarnings("unchecked")
    static List<Long> query(EntityManager em, String base, String branchColumn, String dateExpression,
                            Long branchId, LocalDateTime from, LocalDateTime to) {
        StringBuilder sql = new StringBuilder(base);
        if (branchId != null) sql.append(" AND ").append(branchColumn).append(" = :branch");
        if (from != null) sql.append(" AND ").append(dateExpression).append(" >= :from");
        if (to != null) sql.append(" AND ").append(dateExpression).append(" < :to");
        sql.append(" ORDER BY 1");
        Query q = em.createNativeQuery(sql.toString());
        if (branchId != null) q.setParameter("branch", branchId);
        if (from != null) q.setParameter("from", from);
        if (to != null) q.setParameter("to", to);
        return ((List<Number>) q.getResultList()).stream().map(Number::longValue).toList();
    }
}
