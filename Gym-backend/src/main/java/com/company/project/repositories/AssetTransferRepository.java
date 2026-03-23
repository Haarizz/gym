package com.company.project.repositories;

import com.company.project.entities.AssetTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransferRepository extends JpaRepository<AssetTransfer, Long> {
    List<AssetTransfer> findByAssetId(Long assetId);
}
