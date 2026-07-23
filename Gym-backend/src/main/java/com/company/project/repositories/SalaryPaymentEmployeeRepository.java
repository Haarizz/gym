package com.company.project.repositories;

import com.company.project.entities.SalaryPaymentEmployee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SalaryPaymentEmployeeRepository extends JpaRepository<SalaryPaymentEmployee, Long> {
    Optional<SalaryPaymentEmployee> findByEmployeeId(String employeeId);
}
