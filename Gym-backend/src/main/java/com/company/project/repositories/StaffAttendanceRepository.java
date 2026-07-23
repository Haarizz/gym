package com.company.project.repositories;

import com.company.project.entities.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance, Long> {

    // Active (working) session for a staff member
    Optional<StaffAttendance> findByStaff_IdAndStatus(Long staffId, String status);

    boolean existsByStaff_IdAndStatus(Long staffId, String status);

    @Query("SELECT sa FROM StaffAttendance sa JOIN FETCH sa.staff " +
           "WHERE sa.clockInTime >= :start AND sa.clockInTime < :end " +
           "ORDER BY sa.clockInTime DESC")
    List<StaffAttendance> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    // All active sessions that started before a given time (for auto-close)
    @Query("SELECT sa FROM StaffAttendance sa WHERE sa.status = 'working' AND sa.clockInTime < :before")
    List<StaffAttendance> findActiveSessionsBefore(@Param("before") LocalDateTime before);
}
