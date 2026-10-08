package com.company.project.repositories;

import com.company.project.entities.PosSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PosSettingsRepository extends JpaRepository<PosSettings, Long> {

    Optional<PosSettings> findFirstByBranchId(Long branchId);

    Optional<PosSettings> findFirstByBranchIdIsNull();
}
