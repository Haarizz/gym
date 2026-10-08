package com.company.project.repositories;

import com.company.project.entities.PosHardwareProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PosHardwareProfileRepository extends JpaRepository<PosHardwareProfile, Long> {

    List<PosHardwareProfile> findAllByOrderByNameAsc();

    Optional<PosHardwareProfile> findFirstByBranchIdAndNameIgnoreCase(Long branchId, String name);
}
