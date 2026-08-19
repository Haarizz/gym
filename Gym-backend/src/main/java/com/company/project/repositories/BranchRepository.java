package com.company.project.repositories;

import com.company.project.entities.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {

    List<Branch> findByStatus(String status);

    Optional<Branch> findByBranchCode(String branchCode);

    Optional<Branch> findByIsDefaultTrue();

    boolean existsByBranchCode(String branchCode);

    List<Branch> findByIdIn(List<Long> ids);
}
