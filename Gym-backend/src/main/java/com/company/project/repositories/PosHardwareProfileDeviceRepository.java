package com.company.project.repositories;

import com.company.project.entities.PosHardwareProfileDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PosHardwareProfileDeviceRepository extends JpaRepository<PosHardwareProfileDevice, Long> {

    List<PosHardwareProfileDevice> findByProfileId(Long profileId);

    List<PosHardwareProfileDevice> findByDeviceId(Long deviceId);
}
