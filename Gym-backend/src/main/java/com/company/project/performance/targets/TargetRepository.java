package com.company.project.performance.targets;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TargetRepository extends JpaRepository<Target, Long> {

    /** Targets for this month, plus every repeating target that started before it (resolution picks the latest). */
    @Query("SELECT DISTINCT t FROM Target t LEFT JOIN FETCH t.lines " +
           "WHERE t.periodStart = :month OR (t.repeatMonthly = true AND t.periodStart < :month)")
    List<Target> findApplicableTo(@Param("month") LocalDate month);

    @Query("SELECT DISTINCT t FROM Target t LEFT JOIN FETCH t.lines WHERE t.periodStart = :month")
    List<Target> findForMonth(@Param("month") LocalDate month);
}
