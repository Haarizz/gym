package com.company.project.repositories;

import com.company.project.entities.Integration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IntegrationRepository extends JpaRepository<Integration, Long> {

    Optional<Integration> findByIntegrationKey(String integrationKey);

    boolean existsByIntegrationKeyIgnoreCase(String integrationKey);
}
