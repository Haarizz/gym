package com.company.project.repositories;

import com.company.project.entities.PosDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PosDeviceRepository extends JpaRepository<PosDevice, Long> {

    List<PosDevice> findAllByOrderByDeviceTypeAscNameAsc();

    List<PosDevice> findByPrinterId(Long printerId);

    Optional<PosDevice> findFirstByPrinterIdAndDeviceType(Long printerId, String deviceType);

    Optional<PosDevice> findFirstByBranchIdAndDeviceCodeIgnoreCase(Long branchId, String deviceCode);

    long countByBranchIdAndDeviceType(Long branchId, String deviceType);
}
