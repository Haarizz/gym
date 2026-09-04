package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.TenantConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantConnectionRepository extends JpaRepository<TenantConnection, Long> {
    Optional<TenantConnection> findByTenantId(Long tenantId);
}
