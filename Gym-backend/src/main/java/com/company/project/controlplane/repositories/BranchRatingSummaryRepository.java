package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.BranchRatingSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRatingSummaryRepository extends JpaRepository<BranchRatingSummary, Long> {
    List<BranchRatingSummary> findByTenantSlug(String tenantSlug);
    Optional<BranchRatingSummary> findByTenantSlugAndBranchId(String tenantSlug, Long branchId);
}
