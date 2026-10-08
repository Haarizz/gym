package com.company.project.repositories;

import com.company.project.entities.PosCounter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PosCounterRepository extends JpaRepository<PosCounter, Long> {

    List<PosCounter> findByBranchIdOrderByDisplayOrderAscNameAsc(Long branchId);

    Optional<PosCounter> findFirstByBranchIdAndCodeIgnoreCase(Long branchId, String code);

    Optional<PosCounter> findFirstByBranchIdAndNameIgnoreCase(Long branchId, String name);

    long countByBranchId(Long branchId);
}
