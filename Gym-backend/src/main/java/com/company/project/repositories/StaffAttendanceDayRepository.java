package com.company.project.repositories;

import com.company.project.entities.StaffAttendanceDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StaffAttendanceDayRepository extends JpaRepository<StaffAttendanceDay, Long> {

    java.util.List<StaffAttendanceDay> findByWorkDateBetween(java.time.LocalDate from, java.time.LocalDate to);
    java.util.Optional<StaffAttendanceDay> findByStaffIdAndWorkDate(Long staffId, java.time.LocalDate workDate);
}
