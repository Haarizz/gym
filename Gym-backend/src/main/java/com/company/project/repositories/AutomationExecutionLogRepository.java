package com.company.project.repositories;

import com.company.project.entities.AutomationExecutionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AutomationExecutionLogRepository extends JpaRepository<AutomationExecutionLog, Long> {

    Page<AutomationExecutionLog> findByWorkflowIdOrderByRanAtDesc(Long workflowId, Pageable pageable);

    /** Idempotency guard: did this workflow already run today (scheduler source)? */
    @Query("SELECT COUNT(l) > 0 FROM AutomationExecutionLog l " +
           "WHERE l.workflowId = :workflowId " +
           "AND l.triggerSource = 'scheduler' " +
           "AND l.ranAt >= :startOfDay AND l.ranAt < :endOfDay " +
           "AND l.status = 'success'")
    boolean hasSuccessfulRunToday(
            @Param("workflowId") Long workflowId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay);

    /** Stats rollup for a workflow. */
    @Query("SELECT COUNT(l) FROM AutomationExecutionLog l WHERE l.workflowId = :id AND l.status = :status")
    long countByWorkflowIdAndStatus(@Param("id") Long workflowId, @Param("status") String status);
}
