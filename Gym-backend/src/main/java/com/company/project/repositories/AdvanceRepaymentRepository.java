package com.company.project.repositories;

import com.company.project.entities.AdvanceRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdvanceRepaymentRepository extends JpaRepository<AdvanceRepayment, Long> {

    java.util.List<AdvanceRepayment> findAllByOrderByPeriodMonthDescIdDesc();
    java.util.List<AdvanceRepayment> findByAdvanceIdOrderByPeriodMonthAscIdAsc(Long advanceId);
    java.util.List<AdvanceRepayment> findByPayrollRunId(Long payrollRunId);
}
