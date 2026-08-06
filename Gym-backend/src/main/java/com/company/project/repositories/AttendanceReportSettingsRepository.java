package com.company.project.repositories;

import com.company.project.entities.AttendanceReportSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceReportSettingsRepository extends JpaRepository<AttendanceReportSettings, Long> {
}
