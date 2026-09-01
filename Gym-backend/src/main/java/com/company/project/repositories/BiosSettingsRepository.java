package com.company.project.repositories;

import com.company.project.entities.BiosSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BiosSettingsRepository extends JpaRepository<BiosSettings, Long> {
    Optional<BiosSettings> findByBranchId(Long branchId);
}
