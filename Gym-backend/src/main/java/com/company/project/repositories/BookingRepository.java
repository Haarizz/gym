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
    // Mobile Booking Queries
    @Query("SELECT b FROM Booking b JOIN FETCH b.session s LEFT JOIN FETCH s.trainer " +
           "WHERE b.member.id = :memberId AND b.status <> 'cancelled' " +
           "AND (s.date > :date OR (s.date = :date AND s.startTime >= :time)) " +
           "ORDER BY s.date ASC, s.startTime ASC")
    List<Booking> findUpcomingBookings(
            @Param("memberId") Long memberId, 
            @Param("date") LocalDate date, 
            @Param("time") LocalTime time
    );

    @Query("SELECT b FROM Booking b JOIN FETCH b.session s LEFT JOIN FETCH s.trainer " +
           "WHERE b.member.id = :memberId " +
           "AND (s.date < :date OR (s.date = :date AND s.startTime < :time)) " +
           "ORDER BY s.date DESC, s.startTime DESC")
    List<Booking> findPastBookings(
            @Param("memberId") Long memberId, 
            @Param("date") LocalDate date, 
            @Param("time") LocalTime time
    );

    @Query("SELECT COUNT(b) FROM Booking b JOIN b.session s " +
           "WHERE b.member.id = :memberId AND b.status <> 'cancelled' " +
           "AND (s.date > :date OR (s.date = :date AND s.startTime >= :time))")
    long countUpcomingBookings(
            @Param("memberId") Long memberId, 
            @Param("date") LocalDate date, 
            @Param("time") LocalTime time
    );

    @Query("SELECT COUNT(b) FROM Booking b JOIN b.session s " +
           "WHERE b.member.id = :memberId AND b.status <> 'cancelled' " +
           "AND s.date >= :startOfWeek AND s.date <= :endOfWeek")
    long countBookingsThisWeek(
            @Param("memberId") Long memberId, 
            @Param("startOfWeek") LocalDate startOfWeek, 
            @Param("endOfWeek") LocalDate endOfWeek
    );
    
    @Query("SELECT b FROM Booking b JOIN FETCH b.session s LEFT JOIN FETCH s.trainer " +
           "WHERE b.id = :bookingId AND b.member.id = :memberId")
    java.util.Optional<Booking> findByIdAndMemberId(
            @Param("bookingId") Long bookingId,
            @Param("memberId") Long memberId
    );

    @Query("SELECT b FROM Booking b JOIN FETCH b.session s LEFT JOIN FETCH s.trainer " +
           "WHERE b.member.id = :memberId AND s.date = :date AND b.status <> 'cancelled' " +
           "ORDER BY s.startTime ASC")
    List<Booking> findTodayBookingsByMemberId(
            @Param("memberId") Long memberId,
            @Param("date") LocalDate date
    );

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.member.id = :memberId AND b.status <> 'cancelled'")
    long countActiveBookingsByMemberId(@Param("memberId") Long memberId);
}
