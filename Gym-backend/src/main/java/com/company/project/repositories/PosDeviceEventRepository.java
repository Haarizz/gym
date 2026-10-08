package com.company.project.repositories;

import com.company.project.entities.PosDeviceEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PosDeviceEventRepository extends JpaRepository<PosDeviceEvent, Long> {

    List<PosDeviceEvent> findTop100ByDeviceIdOrderByIdDesc(Long deviceId);

    List<PosDeviceEvent> findTop30ByOrderByIdDesc();
}
