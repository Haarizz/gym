package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GlobalBranchDiscoveryRepository extends JpaRepository<GlobalBranchDiscovery, Long> {
    Optional<GlobalBranchDiscovery> findByTenantSlugAndBranchId(String tenantSlug, Long branchId);
}
