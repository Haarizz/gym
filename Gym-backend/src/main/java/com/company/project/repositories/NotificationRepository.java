package com.company.project.repositories;

import com.company.project.entities.Notification;
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
     * Fetch all role/user-targeted notifications for a user:
     * - their own (targetUserId = uid) OR
     * - role-broadcast for any of their roles (targetRole IN roles AND no specific user)
     * Sorted by priority then date. NOTE: this does NOT filter by module permissions —
     * that's a further in-memory filter applied by NotificationService using the role's
     * effective permission set, since it isn't expressible against the permission tables
     * in this single query.
     */
    @Query("""
        SELECT n FROM Notification n
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND (:branchId IS NULL OR n.branchId = :branchId)
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
    List<Notification> findAllForUser(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles,
        @Param("branchId") Long branchId
    );

    /** Unread role/user-targeted notifications for a user (see findAllForUser for the module-filter note). */
    @Query("""
        SELECT n FROM Notification n
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND n.isRead = false
          AND (:branchId IS NULL OR n.branchId = :branchId)
          AND (
               n.targetUserId = :uid
            OR (n.targetRole IN :roles AND n.targetUserId IS NULL)
          )
        """)
    List<Notification> findUnreadForUser(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles,
        @Param("branchId") Long branchId
    );

    /** Mark all unread as read for the given user + roles. */
    @Modifying
    @Query("""
        UPDATE Notification n SET n.isRead = true
        WHERE n.companyId = :cid
          AND n.isDeleted = false
          AND n.isRead = false
          AND (:branchId IS NULL OR n.branchId = :branchId)
          AND (
               n.targetUserId = :uid
            OR (n.targetRole IN :roles AND n.targetUserId IS NULL)
          )
        """)
    void markAllReadForUser(
        @Param("cid") Long companyId,
        @Param("uid") Long userId,
        @Param("roles") List<String> roles,
        @Param("branchId") Long branchId
    );

    /** Idempotency: find existing notification by company + eventKey. */
    Optional<Notification> findByCompanyIdAndEventKey(Long companyId, String eventKey);

    List<Notification> findTop5ByOrderByCreatedAtDesc();

    /** Cleanup: soft-delete notifications older than a cutoff date. */
    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true WHERE n.createdAt < :cutoff AND n.isDeleted = false")
    void softDeleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
