package com.company.project.repositories.mobile.dashboard;

import com.company.project.entities.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MobileMemberDashboardBookingRepository extends JpaRepository<Booking, Long> {

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
