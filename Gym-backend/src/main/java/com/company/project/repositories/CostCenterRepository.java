package com.company.project.repositories;

import com.company.project.entities.CostCenter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CostCenterRepository extends JpaRepository<CostCenter, Long> {

    Optional<CostCenter> findByCode(String code);

    List<CostCenter> findAllByOrderByCodeAsc();

    List<CostCenter> findByIsActiveTrueOrderByCodeAsc();

    List<CostCenter> findByBranchOrderByCodeAsc(String branch);
}
