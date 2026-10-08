package com.company.project.repositories;

import com.company.project.entities.PosCashMovementCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PosCashMovementCategoryRepository extends JpaRepository<PosCashMovementCategory, Long> {

    List<PosCashMovementCategory> findByBranchIdOrderByDisplayOrderAscNameAsc(Long branchId);

    Optional<PosCashMovementCategory> findFirstByBranchIdAndCodeIgnoreCase(Long branchId, String code);

    Optional<PosCashMovementCategory> findFirstByBranchIdAndNameIgnoreCase(Long branchId, String name);

    long countByBranchId(Long branchId);
}
