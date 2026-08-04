package com.company.project.repositories;

import com.company.project.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Fetch all visible notifications for a user:
     * - their own (targetUserId = uid) OR
     * - role-broadcast for any of their roles (targetRole IN roles AND no specific user)
     * Sorted by priority then date (ORDER BY in @Query overrides Pageable sort for correctness).
     */
    @Query("""
        SELECT n FROM Notification n
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND (
               n.targetUserId = :uid
            OR (n.targetRole IN :roles AND n.targetUserId IS NULL)
          )
        ORDER BY
          CASE n.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH'     THEN 2
            WHEN 'MEDIUM'   THEN 3
            ELSE                 4
          END ASC,
          n.createdAt DESC
        """)
    Page<Notification> findForUser(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles,
        Pageable pageable
    );

    /** Count unread notifications for the given user + roles. */
    @Query("""
        SELECT COUNT(n) FROM Notification n
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND n.isRead = false
          AND (
               n.targetUserId = :uid
            OR (n.targetRole IN :roles AND n.targetUserId IS NULL)
          )
        """)
    long countUnread(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles
    );

    /** Mark all unread as read for the given user + roles. */
    @Modifying
    @Query("""
        UPDATE Notification n SET n.isRead = true
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND n.isRead = false
          AND (
               n.targetUserId = :uid
            OR (n.targetRole IN :roles AND n.targetUserId IS NULL)
          )
        """)
    void markAllReadForUser(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles
    );

    /** Idempotency: find existing notification by company + eventKey. */
    Optional<Notification> findByCompanyIdAndEventKey(Long companyId, String eventKey);

    List<Notification> findTop5ByOrderByCreatedAtDesc();

    /** Cleanup: soft-delete notifications older than a cutoff date. */
    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true WHERE n.createdAt < :cutoff AND n.isDeleted = false")
    void softDeleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
