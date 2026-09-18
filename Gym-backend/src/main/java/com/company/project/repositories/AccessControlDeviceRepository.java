package com.company.project.repositories;

import com.company.project.entities.AccessControlDevice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessControlDeviceRepository extends JpaRepository<AccessControlDevice, Long> {

    boolean existsByDeviceCodeIgnoreCase(String deviceCode);
}
