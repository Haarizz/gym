package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.TenantStats;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantStatsRepository extends JpaRepository<TenantStats, Long> {
}
