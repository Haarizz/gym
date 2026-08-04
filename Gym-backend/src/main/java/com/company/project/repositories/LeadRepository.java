package com.company.project.repositories;

import com.company.project.entities.Lead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long>, JpaSpecificationExecutor<Lead> {

    Optional<Lead> findByLeadId(String leadId);

    long countByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT l.status, COUNT(l) FROM Lead l GROUP BY l.status")
    java.util.List<Object[]> countLeadsByStatus();
}
