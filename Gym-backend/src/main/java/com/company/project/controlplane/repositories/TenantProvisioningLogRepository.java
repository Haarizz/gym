package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.TenantProvisioningLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TenantProvisioningLogRepository extends JpaRepository<TenantProvisioningLog, Long> {
    List<TenantProvisioningLog> findByTenantIdOrderByAttemptedAtAsc(Long tenantId);
}
