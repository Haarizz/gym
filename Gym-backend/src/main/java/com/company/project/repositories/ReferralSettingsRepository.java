package com.company.project.repositories;

import com.company.project.entities.ReferralSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralSettingsRepository extends JpaRepository<ReferralSettings, Long> {
    Optional<ReferralSettings> findByBranchId(Long branchId);
}
