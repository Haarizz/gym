package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
