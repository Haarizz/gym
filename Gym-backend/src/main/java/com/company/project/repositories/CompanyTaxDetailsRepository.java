package com.company.project.repositories;

import com.company.project.entities.CompanyTaxDetails;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyTaxDetailsRepository extends JpaRepository<CompanyTaxDetails, Long> {
    Optional<CompanyTaxDetails> findByBranchId(Long branchId);
}
