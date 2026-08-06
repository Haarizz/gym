package com.company.project.repositories;

import com.company.project.entities.TaxCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaxCodeRepository extends JpaRepository<TaxCode, Long> {
    Optional<TaxCode> findByCode(String code);
}
