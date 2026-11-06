package com.company.project.performance.incentives;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface IncentivePlanRepository extends JpaRepository<IncentivePlan, Long> {

    /** Active plans in force on the given first-of-month (with assignments; lines/bonuses load lazily). */
    @Query("SELECT DISTINCT p FROM IncentivePlan p LEFT JOIN FETCH p.assignments " +
           "WHERE p.status = 'active' AND p.effectiveFrom <= :month AND (p.effectiveTo IS NULL OR p.effectiveTo >= :month)")
    List<IncentivePlan> findInForce(@Param("month") LocalDate month);

    @Query("SELECT DISTINCT p FROM IncentivePlan p LEFT JOIN FETCH p.assignments ORDER BY p.name, p.effectiveFrom")
    List<IncentivePlan> findAllWithAssignments();
}
