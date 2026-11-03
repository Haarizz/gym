package com.company.project.repositories;

import com.company.project.entities.SessionReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SessionReviewRepository extends JpaRepository<SessionReview, Long> {

    @Query("SELECT r FROM SessionReview r LEFT JOIN FETCH r.member WHERE r.sessionId = :sessionId ORDER BY r.createdAt DESC")
    List<SessionReview> findBySessionIdWithMember(@Param("sessionId") Long sessionId);

    Optional<SessionReview> findBySessionIdAndMember_Id(Long sessionId, Long memberId);

    /** (sessionId, review count, average rating) for the session list. */
    @Query("SELECT r.sessionId, COUNT(r), AVG(r.rating) FROM SessionReview r WHERE r.sessionId IN :sessionIds GROUP BY r.sessionId")
    List<Object[]> summarizeBySessionIds(@Param("sessionIds") Collection<Long> sessionIds);
}
