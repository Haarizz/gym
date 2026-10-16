package com.company.project.repositories;

import com.company.project.entities.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {

    java.util.List<PayrollRun> findAllByOrderByPeriodYearDescPeriodMonthDescIdDesc();
    java.util.List<PayrollRun> findByPeriodYearAndPeriodMonth(Integer periodYear, Integer periodMonth);
}
