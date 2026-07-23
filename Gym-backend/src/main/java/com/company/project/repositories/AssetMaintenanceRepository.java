package com.company.project.repositories;

import com.company.project.entities.AssetMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetMaintenanceRepository extends JpaRepository<AssetMaintenance, Long> {
    List<AssetMaintenance> findByAssetId(Long assetId);
}
