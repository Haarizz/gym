package com.company.project.repositories;

import com.company.project.entities.SalaryAdvance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SalaryAdvanceRepository extends JpaRepository<SalaryAdvance, Long> {

    List<SalaryAdvance> findByEmployeeIdOrderByRequestDateDescIdDesc(String employeeId);

    boolean existsByEmployeeIdAndStatus(String employeeId, String status);

    List<SalaryAdvance> findByEmployeeIdAndStatusIn(String employeeId, Collection<String> statuses);
}
