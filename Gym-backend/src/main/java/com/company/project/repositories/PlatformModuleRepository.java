package com.company.project.repositories;

import com.company.project.entities.PlatformModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatformModuleRepository extends JpaRepository<PlatformModule, Long> {

    Optional<PlatformModule> findByModuleKey(String moduleKey);

    boolean existsByModuleKey(String moduleKey);
}
