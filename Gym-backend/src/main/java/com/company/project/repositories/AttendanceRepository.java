package com.company.project.repositories;

import com.company.project.entities.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByMember_IdOrderByCheckInTimeDesc(Long memberId);

    // ── Date-range queries ────────────────────────────────────────────────────

    @Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.member " +
           "WHERE a.checkInTime >= :start AND a.checkInTime < :end " +
           "ORDER BY a.checkInTime DESC")
    List<Attendance> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    // Alias used by CheckInService.getTodayAttendance()
    @Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.member " +
           "WHERE a.checkInTime >= :startOfDay AND a.checkInTime < :endOfDay " +
           "ORDER BY a.checkInTime DESC")
    List<Attendance> findTodayAttendance(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.member " +
           "WHERE a.checkInTime >= :start AND a.checkInTime < :end " +
           "AND (CAST(:search AS string) IS NULL OR LOWER(a.member.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "     OR LOWER(a.walkInName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) " +
           "ORDER BY a.checkInTime DESC")
    Page<Attendance> findByDateRangeAndSearch(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("search") String search,
            Pageable pageable
    );

    // ── Counts ────────────────────────────────────────────────────────────────

    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.checkInTime >= :start AND a.checkInTime < :end")
    long countByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.member.id = :memberId AND a.checkInTime >= :startOfDay AND a.checkInTime < :endOfDay")
    long countTodayVisits(
            @Param("memberId") Long memberId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    // ── Duplicate / active session prevention ─────────────────────────────────

    @Query("SELECT COUNT(a) > 0 FROM Attendance a " +
           "WHERE a.member.id = :memberId AND a.status = 'active' " +
           "AND a.checkInTime >= :startOfDay AND a.checkInTime < :endOfDay")
    boolean existsActiveSessionForMember(
            @Param("memberId") Long memberId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    // ── Auto-close (midnight cron) ────────────────────────────────────────────

    @Query("SELECT a FROM Attendance a WHERE a.status = 'active' AND a.checkInTime < :before")
    List<Attendance> findActiveSessionsBefore(@Param("before") LocalDateTime before);
}
