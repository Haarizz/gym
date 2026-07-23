package com.company.project.repositories;

import com.company.project.entities.TaxCompliance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxComplianceRepository extends JpaRepository<TaxCompliance, Long> {

    List<TaxCompliance> findAllByOrderByDueDateDesc();

    List<TaxCompliance> findByTaxTypeOrderByDueDateDesc(String taxType);

    List<TaxCompliance> findByStatusOrderByDueDateDesc(String status);
}
