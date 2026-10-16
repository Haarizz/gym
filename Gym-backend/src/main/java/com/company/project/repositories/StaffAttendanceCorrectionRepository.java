package com.company.project.repositories;

import com.company.project.entities.StaffAttendanceCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StaffAttendanceCorrectionRepository extends JpaRepository<StaffAttendanceCorrection, Long> {

    java.util.List<StaffAttendanceCorrection> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
