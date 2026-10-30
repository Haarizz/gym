package com.company.project.repositories;

import com.company.project.entities.CheckInSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CheckInSettingsRepository extends JpaRepository<CheckInSettings, Long> {
    Optional<CheckInSettings> findByBranchId(Long branchId);
}
