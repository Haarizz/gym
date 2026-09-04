package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.PlatformUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformUserRepository extends JpaRepository<PlatformUser, Long> {
}
