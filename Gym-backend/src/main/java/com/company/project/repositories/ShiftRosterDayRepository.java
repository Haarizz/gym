package com.company.project.repositories;

import com.company.project.entities.ShiftRosterDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftRosterDayRepository extends JpaRepository<ShiftRosterDay, Long> {

    java.util.List<ShiftRosterDay> findByWorkDateBetween(java.time.LocalDate from, java.time.LocalDate to);
    java.util.Optional<ShiftRosterDay> findByStaffIdAndWorkDate(Long staffId, java.time.LocalDate workDate);
}
