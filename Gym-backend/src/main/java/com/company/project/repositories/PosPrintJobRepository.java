package com.company.project.repositories;

import com.company.project.entities.PosPrintJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;

public interface PosPrintJobRepository extends JpaRepository<PosPrintJob, Long>, JpaSpecificationExecutor<PosPrintJob> {

    long countByStatusAndCreatedAtAfter(String status, LocalDateTime after);

    long countByStatus(String status);
}
