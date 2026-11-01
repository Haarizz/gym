package com.company.project.repositories;

import com.company.project.entities.Conversation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /** Locks the row while a message is added, so two quick sends can't both slip under the caps. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Conversation c WHERE c.id = :id")
    Optional<Conversation> findByIdForUpdate(@Param("id") Long id);

    List<Conversation> findByMemberIdAndBranchIdOrderByLastMessageAtDesc(Long memberId, Long branchId);

    Optional<Conversation> findByBranchIdAndMemberIdAndStaffId(Long branchId, Long memberId, Long staffId);

    Optional<Conversation> findByBranchIdAndMemberIdAndStaffIdIsNull(Long branchId, Long memberId);

    /** A staff member's own threads, plus the branch's front-desk threads when they work the desk. */
    @Query("SELECT c FROM Conversation c WHERE c.branchId = :branchId "
            + "AND (c.staffId = :staffId OR (:frontDesk = true AND c.staffId IS NULL)) "
            + "AND c.lastMessageAt IS NOT NULL "
            + "ORDER BY c.lastMessageAt DESC")
    List<Conversation> findStaffInbox(@Param("branchId") Long branchId,
                                      @Param("staffId") Long staffId,
                                      @Param("frontDesk") boolean frontDesk);

    /** Conversations a staff member started today, for the daily new-conversation cap. */
    long countByStartedByStaffIdAndCreatedAtGreaterThanEqual(Long staffId, LocalDateTime since);

    List<Conversation> findByStaffPushPendingSinceIsNotNull();
}
