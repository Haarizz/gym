package com.company.project.performance.events;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PerformanceEventRepository extends JpaRepository<PerformanceEvent, Long> {

    List<PerformanceEvent> findBySourceTypeAndSourceIdOrderByRevisionAsc(String sourceType, Long sourceId);

    /** (staffId, metric, sum quantity, sum amount) for the given staff in [start, end). */
    @Query("SELECT e.staffId, e.metric, SUM(e.quantity), SUM(e.amount) FROM PerformanceEvent e " +
           "WHERE e.staffId IN :staffIds AND e.occurredAt >= :start AND e.occurredAt < :end " +
           "GROUP BY e.staffId, e.metric")
    List<Object[]> sumByStaff(@Param("staffIds") Collection<Long> staffIds,
                              @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** (metric, sum quantity, sum amount) for a whole branch in [start, end), credited or not. */
    @Query("SELECT e.metric, SUM(e.quantity), SUM(e.amount) FROM PerformanceEvent e " +
           "WHERE e.branchId = :branchId AND e.occurredAt >= :start AND e.occurredAt < :end GROUP BY e.metric")
    List<Object[]> sumByBranch(@Param("branchId") Long branchId,
                               @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** (metric, sum quantity, sum amount) across every branch in [start, end). */
    @Query("SELECT e.metric, SUM(e.quantity), SUM(e.amount) FROM PerformanceEvent e " +
           "WHERE e.occurredAt >= :start AND e.occurredAt < :end GROUP BY e.metric")
    List<Object[]> sumAll(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** (staffId, branchId, metric, sum quantity, sum amount) — the role-target view needs the branch. */
    @Query("SELECT e.staffId, e.branchId, e.metric, SUM(e.quantity), SUM(e.amount) FROM PerformanceEvent e " +
           "WHERE e.staffId IN :staffIds AND e.occurredAt >= :start AND e.occurredAt < :end " +
           "GROUP BY e.staffId, e.branchId, e.metric")
    List<Object[]> sumByStaffAndBranch(@Param("staffIds") Collection<Long> staffIds,
                                       @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /** A person's credited activity, newest first (ledger transaction list, audit trail). */
    @Query("SELECT e FROM PerformanceEvent e WHERE e.staffId = :staffId AND e.occurredAt >= :start AND e.occurredAt < :end " +
           "ORDER BY e.occurredAt DESC, e.id DESC")
    List<PerformanceEvent> findForStaff(@Param("staffId") Long staffId, @Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end, Pageable page);

    @Query("SELECT COUNT(e) FROM PerformanceEvent e")
    long countAll();
}
