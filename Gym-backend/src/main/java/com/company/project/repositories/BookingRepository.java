package com.company.project.repositories;

import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    java.util.Optional<Booking> findByQrCode(String qrCode);
    long countBySessionIdAndStatusNot(Long sessionId, String status);
    boolean existsBySessionId(Long sessionId);
    long deleteBySessionId(Long sessionId);

    @Query("select b.session.id, count(b) from Booking b where b.session.id in :sessionIds and b.status <> 'cancelled' group by b.session.id")
    List<Object[]> countActiveBySessionIds(@Param("sessionIds") List<Long> sessionIds);

    /**
     * Members with a confirmed booking on the given date whose class starts
     * between windowStart and windowEnd (used by the class-reminder trigger).
     */
    @Query("SELECT DISTINCT b.member FROM Booking b " +
           "WHERE b.status = 'confirmed' " +
           "AND b.member IS NOT NULL " +
           "AND b.member.userId IS NOT NULL " +
           "AND b.session.date = :date " +
           "AND b.session.startTime >= :windowStart " +
           "AND b.session.startTime < :windowEnd")
    List<Member> findMembersWithUpcomingClass(
            @Param("date") LocalDate date,
            @Param("windowStart") LocalTime windowStart,
            @Param("windowEnd") LocalTime windowEnd);
}
