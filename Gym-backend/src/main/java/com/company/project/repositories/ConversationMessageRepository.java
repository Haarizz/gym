package com.company.project.repositories;

import com.company.project.entities.ConversationMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

    /** Newest first; beforeId null = from the latest. */
    @Query("SELECT m FROM ConversationMessage m WHERE m.conversationId = :conversationId "
            + "AND (:beforeId IS NULL OR m.id < :beforeId) ORDER BY m.id DESC")
    List<ConversationMessage> findPage(@Param("conversationId") Long conversationId,
                                       @Param("beforeId") Long beforeId,
                                       Pageable pageable);

    /** What a report opens: everything up to the moment it was filed, deleted messages included. */
    List<ConversationMessage> findByConversationIdAndCreatedAtLessThanEqualOrderByIdAsc(Long conversationId, LocalDateTime until);

    /** Messages a member sent today across all their conversations, for the daily cap. */
    @Query("SELECT COUNT(m) FROM ConversationMessage m, Conversation c "
            + "WHERE m.conversationId = c.id AND c.memberId = :memberId "
            + "AND m.senderType = 'MEMBER' AND m.createdAt >= :since")
    long countMemberMessagesSince(@Param("memberId") Long memberId, @Param("since") LocalDateTime since);
}
