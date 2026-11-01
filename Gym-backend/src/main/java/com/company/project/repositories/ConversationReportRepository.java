package com.company.project.repositories;

import com.company.project.entities.ConversationReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationReportRepository extends JpaRepository<ConversationReport, Long> {

    boolean existsByMessageIdAndReportedByTypeAndReportedByIdAndStatus(
            Long messageId, String reportedByType, Long reportedById, String status);

    /** Scoped to the active branch by the branch filter; null status = any. */
    @Query("SELECT r FROM ConversationReport r WHERE (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    Page<ConversationReport> search(@Param("status") String status, Pageable pageable);

    long countByStatus(String status);
}
