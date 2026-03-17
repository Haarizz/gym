package com.company.project.repositories;

import com.company.project.entities.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    long countBySessionIdAndStatusNot(Long sessionId, String status);
    boolean existsBySessionId(Long sessionId);
    long deleteBySessionId(Long sessionId);

    @Query("select b.session.id, count(b) from Booking b where b.session.id in :sessionIds and b.status <> 'cancelled' group by b.session.id")
    List<Object[]> countActiveBySessionIds(@Param("sessionIds") List<Long> sessionIds);
}
