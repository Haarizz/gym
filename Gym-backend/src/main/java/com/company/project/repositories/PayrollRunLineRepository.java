package com.company.project.repositories;

import com.company.project.entities.PayrollRunLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PayrollRunLineRepository extends JpaRepository<PayrollRunLine, Long> {

    java.util.List<PayrollRunLine> findByRunIdOrderByEmployeeNameAsc(Long runId);
    void deleteByRunId(Long runId);
    java.util.List<PayrollRunLine> findByRunIdIn(java.util.Collection<Long> runIds);
}
