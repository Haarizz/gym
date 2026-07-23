package com.company.project.repositories;

import com.company.project.entities.SalaryPayment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
}
