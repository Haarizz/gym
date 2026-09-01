package com.company.project.repositories;

import com.company.project.entities.AttendanceReportSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttendanceReportSettingsRepository extends JpaRepository<AttendanceReportSettings, Long> {
    Optional<AttendanceReportSettings> findByBranchId(Long branchId);
}
