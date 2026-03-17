package com.company.project.repositories;

import com.company.project.entities.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    List<Supplier> findByIsActiveTrueOrderByNameAsc();

    Optional<Supplier> findByEmail(String email);
}
