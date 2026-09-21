package com.company.project.repositories;

import com.company.project.entities.SalaryPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
    List<SalaryPayment> findByEmployeeIdOrderByPaymentDateDesc(String employeeId);
}
