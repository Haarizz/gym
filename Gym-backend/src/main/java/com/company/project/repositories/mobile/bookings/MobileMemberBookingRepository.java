package com.company.project.repositories.mobile.bookings;

import com.company.project.entities.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MobileMemberBookingRepository extends JpaRepository<Booking, Long> {

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
    Optional<Booking> findByIdAndMemberId(
            @Param("bookingId") Long bookingId,
            @Param("memberId") Long memberId
    );
}
