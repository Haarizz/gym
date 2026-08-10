package com.company.project.repositories;

import com.company.project.entities.CompanyTaxDetails;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyTaxDetailsRepository extends JpaRepository<CompanyTaxDetails, Long> {
}
