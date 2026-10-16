package com.company.project.repositories;

import com.company.project.entities.EmployeeDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeDeductionRepository extends JpaRepository<EmployeeDeduction, Long> {

    java.util.List<EmployeeDeduction> findAllByOrderByCreatedAtDesc();
    java.util.List<EmployeeDeduction> findByStatus(String status);
}
